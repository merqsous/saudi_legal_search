import re
import os
import psycopg2


DB_NAME = "saudi_cases"
DB_USER = os.getenv("USER")
DB_HOST = "localhost"
DB_PORT = "5432"


MAX_CHARS = 2500
OVERLAP_CHARS = 300


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def chunk_text(text: str, max_chars=MAX_CHARS, overlap=OVERLAP_CHARS):
    text = clean(text)

    if not text:
        return []

    if len(text) <= max_chars:
        return [text]

    chunks = []
    start = 0

    while start < len(text):
        end = start + max_chars
        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        start = end - overlap

        if start < 0:
            start = 0

        if start >= len(text):
            break

    return chunks


def main():
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        host=DB_HOST,
        port=DB_PORT,
    )

    cur = conn.cursor()

    # Start clean
    cur.execute("TRUNCATE judgment_chunks RESTART IDENTITY;")
    conn.commit()

    cur.execute("""
        SELECT id, judgment_id, section_code, section_text
        FROM judgment_sections
        WHERE section_text IS NOT NULL
          AND length(section_text) > 0
        ORDER BY judgment_id, section_order;
    """)

    sections = cur.fetchall()

    total_chunks = 0

    for section_id, judgment_id, section_code, section_text in sections:
        chunks = chunk_text(section_text)

        for i, chunk in enumerate(chunks, start=1):
            cur.execute("""
                INSERT INTO judgment_chunks (
                    judgment_id,
                    section_id,
                    chunk_order,
                    chunk_text
                )
                VALUES (%s, %s, %s, %s);
            """, (judgment_id, section_id, i, chunk))

            total_chunks += 1

        if total_chunks % 1000 == 0:
            conn.commit()
            print(f"Inserted {total_chunks} chunks")

    conn.commit()
    cur.close()
    conn.close()

    print(f"Done. Inserted {total_chunks} chunks.")


if __name__ == "__main__":
    main()
