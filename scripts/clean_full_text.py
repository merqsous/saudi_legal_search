"""Clean full_text and chunks in the database by removing MOJ website boilerplate."""
import re
from api.db import get_db

# MOJ footer patterns - these mark the start of the footer section
FOOTER_MARKERS = [
    "البريدية اتفاقية مستوى الخدمة",
    "الإلكترونية تقديم شكوى بلاغ عن فساد",
    "الاتصال و المساعدة اتصل بنا",
    "عن البوابة من نحن استراتيجية",
    "من نحن استراتيجية امن المعلومات",
]

# MOJ header patterns - text before the actual judgment
HEADER_MARKER = "نص الحكم"

# JSON metadata pattern
JSON_PATTERN = re.compile(r'^\s*\{\s*"page_number"')


def clean_full_text(text: str) -> str:
    """Remove MOJ website navigation, header, and footer from full_text."""
    if not text:
        return text

    # Remove footer - find the earliest footer marker and cut everything after it
    earliest_pos = len(text)
    for marker in FOOTER_MARKERS:
        pos = text.find(marker)
        if pos != -1 and pos < earliest_pos:
            earliest_pos = pos

    if earliest_pos < len(text):
        text = text[:earliest_pos].strip()

    return text


def is_footer_chunk(chunk_text: str) -> bool:
    """Check if a chunk is entirely MOJ footer/navigation text."""
    if not chunk_text:
        return True

    # JSON metadata chunks
    if JSON_PATTERN.match(chunk_text):
        return True

    # Chunks that are entirely footer text
    for marker in FOOTER_MARKERS:
        if marker in chunk_text and len(chunk_text) < 600:
            return True

    # Chunks that start with footer text
    for marker in FOOTER_MARKERS:
        if chunk_text.strip().startswith(marker):
            return True

    # Chunks ending with the copyright notice
    if "جميع الحقوق محفوظة لدى وزارة العدل" in chunk_text:
        return True

    return False


def run_migration():
    """Clean full_text and delete bad chunks in the database."""
    with get_db() as conn:
        cur = conn.cursor()

        # 1. Clean full_text for all judgments
        print("Cleaning full_text...")
        cur.execute("SELECT id, full_text FROM judgments WHERE full_text IS NOT NULL")
        rows = cur.fetchall()

        cleaned_count = 0
        for jid, ft in rows:
            cleaned = clean_full_text(ft)
            if cleaned != ft:
                cur.execute(
                    "UPDATE judgments SET full_text = %s WHERE id = %s",
                    [cleaned, jid],
                )
                cleaned_count += 1

        print(f"  Cleaned {cleaned_count} judgment full_text records")

        # 2. Delete JSON metadata chunks
        print("Deleting JSON metadata chunks...")
        cur.execute(
            """DELETE FROM judgment_chunks WHERE chunk_text LIKE '{ "page_number"%%'"""
        )
        print(f"  Deleted {cur.rowcount} JSON chunks")

        # 3. Delete footer chunks
        print("Deleting footer chunks...")
        footer_count = 0
        cur.execute("SELECT id, chunk_text FROM judgment_chunks")
        all_chunks = cur.fetchall()
        for cid, ct in all_chunks:
            if is_footer_chunk(ct):
                cur.execute("DELETE FROM judgment_chunks WHERE id = %s", [cid])
                footer_count += 1

        print(f"  Deleted {footer_count} footer chunks")

        # 4. Delete empty chunks
        print("Deleting empty chunks...")
        cur.execute("DELETE FROM judgment_chunks WHERE length(trim(chunk_text)) < 10")
        print(f"  Deleted {cur.rowcount} empty chunks")

        print("Migration complete!")


if __name__ == "__main__":
    run_migration()
