"""Clean portal footer and junk text from judgment content."""
import re
import time
from psycopg2.extras import execute_values
from api.db import query_all, get_db


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
    # If no full marker, remove trailing footer phrases one by one from the end
    cleaned = text
    for phrase in FOOTER_PHRASES:
        if cleaned.endswith(phrase):
            cleaned = cleaned[: -len(phrase)].rstrip()
            # Remove trailing punctuation
            cleaned = re.sub(r'[\s\.،؛]+$', '', cleaned)
    return cleaned


def update_batch(table: str, columns: tuple, rows: list, dry_run: bool) -> int:
    """Update a small batch of rows using a fresh short-lived connection."""
    if not rows or dry_run:
        return len(rows)

    id_col, text_col = columns
    update_sql = (
        f"UPDATE {table} AS t SET {text_col} = v.{text_col} "
        f"FROM (VALUES %s) AS v({id_col}, {text_col}) "
        f"WHERE t.{id_col} = v.{id_col};"
    )

    # Use a new connection for each batch so the proxy doesn't kill a long-lived one
    with get_db() as conn:
        cur = conn.cursor()
        execute_values(cur, update_sql, rows, template="(%s, %s)")
        updated = cur.rowcount
        cur.close()
    return updated


def clean_all_judgments(dry_run: bool = True, fetch_size: int = 5000, update_size: int = 200) -> dict:
    """Clean footer text from all judgments and chunks using paginated fetch and short-lived connections."""
    results = {"judgments_updated": 0, "chunks_updated": 0, "samples": []}

    # --- Clean judgments.full_text ---
    print("Cleaning judgments.full_text...")
    last_id = 0
    total = 0
    while True:
        rows = query_all(
            "SELECT id, full_text FROM judgments WHERE id > %s AND full_text IS NOT NULL AND full_text != '' ORDER BY id LIMIT %s;",
            (last_id, fetch_size),
        )
        if not rows:
            break

        batch_rows = []
        for j in rows:
            original = j["full_text"]
            cleaned = clean_judgment_text(original)
            if cleaned != original:
                results["judgments_updated"] += 1
                batch_rows.append((j["id"], cleaned))
                if len(results["samples"]) < 3:
                    results["samples"].append({"id": j["id"], "before": original[-200:], "after": cleaned[-200:]})

        if not dry_run:
            # Process in small update-size batches to avoid large network queries
            for i in range(0, len(batch_rows), update_size):
                chunk = batch_rows[i : i + update_size]
                update_batch("judgments", ("id", "full_text"), chunk, dry_run)

        total += len(rows)
        last_id = rows[-1]["id"]
        print(f"  Processed {total} judgments...")

    # --- Clean judgment_chunks.chunk_text ---
    print("Cleaning judgment_chunks.chunk_text...")
    last_id = 0
    total = 0
    while True:
        rows = query_all(
            "SELECT id, chunk_text FROM judgment_chunks WHERE id > %s AND chunk_text IS NOT NULL AND chunk_text != '' ORDER BY id LIMIT %s;",
            (last_id, fetch_size),
        )
        if not rows:
            break

        batch_rows = []
        for c in rows:
            original = c["chunk_text"]
            cleaned = clean_chunk_text(original)
            if cleaned != original:
                results["chunks_updated"] += 1
                batch_rows.append((c["id"], cleaned))

        if not dry_run:
            for i in range(0, len(batch_rows), update_size):
                chunk = batch_rows[i : i + update_size]
                update_batch("judgment_chunks", ("id", "chunk_text"), chunk, dry_run)

        total += len(rows)
        last_id = rows[-1]["id"]
        print(f"  Processed {total} chunks...")

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
