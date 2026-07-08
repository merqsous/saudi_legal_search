import os
import time
import json
from typing import List, Tuple

import psycopg2
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

DB_NAME = "saudi_cases"
DB_USER = os.getenv("USER")
DB_HOST = "localhost"
DB_PORT = "5432"

MODEL = "text-embedding-3-small"
BATCH_SIZE = 100

client = OpenAI()


def vector_to_sql(vector: List[float]) -> str:
    return "[" + ",".join(str(x) for x in vector) + "]"


def get_unembedded_chunks(cur, limit: int) -> List[Tuple[int, str]]:
    cur.execute(
        """
        SELECT id, chunk_text
        FROM judgment_chunks
        WHERE embedding IS NULL
        ORDER BY id
        LIMIT %s;
        """,
        (limit,),
    )
    return cur.fetchall()


def embed_texts(texts: List[str]) -> List[List[float]]:
    response = client.embeddings.create(
        model=MODEL,
        input=texts,
    )
    return [item.embedding for item in response.data]


def main():
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        host=DB_HOST,
        port=DB_PORT,
    )

    cur = conn.cursor()

    total_done = 0

    while True:
        rows = get_unembedded_chunks(cur, BATCH_SIZE)

        if not rows:
            break

        ids = [row[0] for row in rows]
        texts = [row[1] for row in rows]

        try:
            vectors = embed_texts(texts)

            for chunk_id, vector in zip(ids, vectors):
                cur.execute(
                    """
                    UPDATE judgment_chunks
                    SET embedding = %s::vector
                    WHERE id = %s;
                    """,
                    (vector_to_sql(vector), chunk_id),
                )

            conn.commit()
            total_done += len(rows)
            print(f"Embedded {total_done} chunks")

        except Exception as e:
            conn.rollback()
            print("Error:", type(e).__name__, e)
            print("Sleeping 10 seconds then retrying...")
            time.sleep(10)

    cur.close()
    conn.close()

    print("Done embedding chunks.")


if __name__ == "__main__":
    main()
