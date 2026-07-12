"""Clean portal footer and junk text from judgment content."""
import os
import re
import time
from psycopg2.extras import execute_values


MAX_RETRIES = 5
RETRY_BASE_DELAY = 2  # seconds
PAGE_DELAY = 0.5  # seconds between pages to avoid proxy rate limits


# Common footer markers from the Saudi Najiz portal that appear at the end of judgment text
FOOTER_START_MARKERS = [
    "عن البوابة",
    "اتفاقية مستوى الخدمة",
    "سياسة الخصوصية",
    "شروط الاستخدام",
    "خريطة الموقع",
    "rc@moj.gov.sa",
    "جميع الحقوق محفوظة",
]

# Phrases that, if found at the end of a chunk, should be removed
FOOTER_PHRASES = [
    "عن البوابة",
    "من نحن",
    "استراتيجية امن المعلومات",
    "الأخبار",
    "الاشتراك في النشرة البريدية",
    "اتفاقية مستوى الخدمة",
    "سهولة الوصول",
    "الاتصال و المساعدة",
    "اتصل بنا",
    "المشاركة المجتمعية",
    "الإلكترونية",
    "تقديم شكوى",
    "بلاغ عن فساد",
    "سياسة حق الحصول على المعلومة",
    "الأسئلة الشائعة",
    "روابط مهمة",
    "المجلس الأعلى للقضاء",
    "المنصة الوطنية",
    "البوابة الوطنية للبيانات المفتوحة",
    "منصة المشاركة المجتمعية",
    "منصة الاستشارات القانونية",
    "تابعنا على",
    "أدوات الاتاحة والوصول",
    "الدعم الفني",
    "بلغة الإشارة",
    "المحادثة الفورية",
    "حمل تطبيق ناجز",
    "سياسة الخصوصية",
    "شروط الاستخدام",
    "خريطة الموقع",
    "rc@moj.gov.sa",
    "جميع الحقوق محفوظة",
    "وزارة العدل",
    "©",
]


def clean_judgment_text(text: str) -> str:
    """Remove portal footer from full judgment text."""
    if not text:
        return text
    for marker in FOOTER_START_MARKERS:
        idx = text.find(marker)
        if idx != -1:
            return text[:idx].rstrip()
    return text


def clean_chunk_text(text: str) -> str:
    """Remove footer fragments from chunk text."""
    if not text:
        return text
    # Remove from the first footer marker to the end of the chunk
    for marker in FOOTER_START_MARKERS:
        idx = text.find(marker)
        if idx != -1:
            return text[:idx].rstrip()
    # If no full marker, keep removing trailing footer phrases until none are left
    cleaned = text
    changed = True
    while changed:
        changed = False
        for phrase in FOOTER_PHRASES:
            if cleaned.endswith(phrase):
                cleaned = cleaned[: -len(phrase)].rstrip()
                # Remove trailing punctuation
                cleaned = re.sub(r'[\s\.،؛]+$', '', cleaned)
                changed = True
                break
    return cleaned


def get_db_with_retry():
    """Open a DB connection with retry + exponential backoff."""
    import psycopg2
    from api.config import DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT

    for attempt in range(MAX_RETRIES):
        try:
            conn = psycopg2.connect(
                dbname=DB_NAME,
                user=DB_USER,
                password=DB_PASSWORD,
                host=DB_HOST,
                port=DB_PORT,
                connect_timeout=30,
            )
            conn.autocommit = True
            return conn
        except (psycopg2.OperationalError, psycopg2.InterfaceError) as e:
            delay = RETRY_BASE_DELAY * (2 ** attempt)
            print(f"  Connection failed (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
            if attempt < MAX_RETRIES - 1:
                print(f"  Retrying in {delay}s...")
                time.sleep(delay)
            else:
                raise


def clean_all_judgments(dry_run: bool = True, fetch_size: int = 5000, update_size: int = 1000) -> dict:
    """Clean footer text from all judgments and chunks using paginated fetch and per-page connections."""
    from psycopg2.extras import RealDictCursor

    results = {"judgments_updated": 0, "chunks_updated": 0, "samples": []}

    update_sql_template = (
        "UPDATE {table} AS t SET {text_col} = v.{text_col} "
        "FROM (VALUES %s) AS v(id, {text_col}) "
        "WHERE t.id = v.id;"
    )

    def clean_page(conn, table, text_col, last_id, results_key, samples):
        select_sql = (
            "SELECT id, {text_col} FROM {table} WHERE id > %s AND {text_col} IS NOT NULL AND {text_col} != '' ORDER BY id LIMIT %s;"
        ).format(table=table, text_col=text_col)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(select_sql, (last_id, fetch_size))
        rows = cur.fetchall()
        cur.close()

        if not rows:
            return None

        batch_rows = []
        for r in rows:
            original = r[text_col]
            cleaned = clean_judgment_text(original) if text_col == "full_text" else clean_chunk_text(original)
            if cleaned != original:
                results[results_key] += 1
                batch_rows.append((r["id"], cleaned))
                if len(samples) < 3:
                    samples.append({"id": r["id"], "before": original[-200:], "after": cleaned[-200:]})

        if not dry_run and batch_rows:
            update_sql = update_sql_template.format(table=table, text_col=text_col)
            cur = conn.cursor()
            execute_values(cur, update_sql, batch_rows, template="(%s, %s)", page_size=update_size)
            cur.close()

        return rows

    def process_table(table, text_col, results_key, samples, start_id=0):
        label = f"{table}.{text_col}"
        last_id = start_id
        total = 0
        print(f"Cleaning {label}...")
        while True:
            conn = get_db_with_retry()
            try:
                rows = clean_page(conn, table, text_col, last_id, results_key, samples)
            finally:
                conn.close()
            if rows is None:
                break
            total += len(rows)
            last_id = rows[-1]["id"]
            print(f"  Processed {total} rows from {label}... (last_id={last_id})")
            time.sleep(PAGE_DELAY)
        return last_id, total

    # Allow resuming chunks from a specific ID via env var
    chunks_start_id = int(os.environ.get("CHUNKS_START_ID", "0"))

    # Clean judgments.full_text
    process_table("judgments", "full_text", "judgments_updated", results["samples"])

    # Clean judgment_chunks.chunk_text
    process_table("judgment_chunks", "chunk_text", "chunks_updated", [], start_id=chunks_start_id)

    return results


if __name__ == "__main__":
    import sys
    dry_run = not ("--apply" in sys.argv)
    mode = "DRY RUN" if dry_run else "APPLYING CHANGES"
    print(f"=== Cleaning judgment footers ({mode}) ===\n")
    start = time.time()
    results = clean_all_judgments(dry_run=dry_run)
    print(f"\nJudgments with footer removed: {results['judgments_updated']}")
    print(f"Chunks with footer removed: {results['chunks_updated']}")
    print(f"Elapsed: {time.time() - start:.1f}s")
    if results["samples"]:
        print("\n=== Sample cleanups ===")
        for s in results["samples"]:
            print(f"\nJudgment {s['id']}:")
            print(f"  Before: ...{s['before']}")
            print(f"  After:  ...{s['after']}")
    if dry_run:
        print("\nThis was a dry run. Add --apply to actually update the database.")
