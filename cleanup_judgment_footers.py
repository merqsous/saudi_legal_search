"""Clean portal footer and junk text from judgment content."""
import re
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


def clean_all_judgments(dry_run: bool = True, batch_size: int = 500) -> dict:
    """Clean footer text from all judgments and chunks with batched commits."""
    judgments = query_all("SELECT id, full_text FROM judgments WHERE full_text IS NOT NULL AND full_text != '';")
    results = {"judgments_updated": 0, "chunks_updated": 0, "samples": []}

    with get_db() as conn:
        cur = conn.cursor()
        for i, j in enumerate(judgments):
            original = j["full_text"]
            cleaned = clean_judgment_text(original)
            if cleaned != original:
                if not dry_run:
                    cur.execute("UPDATE judgments SET full_text = %s WHERE id = %s;", (cleaned, j["id"]))
                results["judgments_updated"] += 1
                if len(results["samples"]) < 3:
                    results["samples"].append({"id": j["id"], "before": original[-200:], "after": cleaned[-200:]})

            if not dry_run and (i + 1) % batch_size == 0:
                conn.commit()
                print(f"  Committed judgments batch {i + 1}/{len(judgments)}")

        chunks = query_all("SELECT id, chunk_text FROM judgment_chunks WHERE chunk_text IS NOT NULL AND chunk_text != '';")
        for i, c in enumerate(chunks):
            original = c["chunk_text"]
            cleaned = clean_chunk_text(original)
            if cleaned != original:
                if not dry_run:
                    cur.execute("UPDATE judgment_chunks SET chunk_text = %s WHERE id = %s;", (cleaned, c["id"]))
                results["chunks_updated"] += 1

            if not dry_run and (i + 1) % batch_size == 0:
                conn.commit()
                print(f"  Committed chunks batch {i + 1}/{len(chunks)}")

        if not dry_run:
            conn.commit()
        cur.close()

    return results


if __name__ == "__main__":
    import sys
    dry_run = not ("--apply" in sys.argv)
    mode = "DRY RUN" if dry_run else "APPLYING CHANGES"
    print(f"=== Cleaning judgment footers ({mode}) ===\n")
    results = clean_all_judgments(dry_run=dry_run)
    print(f"Judgments with footer removed: {results['judgments_updated']}")
    print(f"Chunks with footer removed: {results['chunks_updated']}")
    if results["samples"]:
        print("\n=== Sample cleanups ===")
        for s in results["samples"]:
            print(f"\nJudgment {s['id']}:")
            print(f"  Before: ...{s['before']}")
            print(f"  After:  ...{s['after']}")
    if dry_run:
        print("\nThis was a dry run. Add --apply to actually update the database.")
