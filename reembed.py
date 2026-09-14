"""Re-embed all judgment chunks with text-embedding-3-large.

Writes to a new `embedding_large` column for zero-downtime migration:
- Old `embedding` column (text-embedding-3-small) continues serving searches
- This script populates `embedding_large` in batches
- Once complete, switch search code to use `embedding_large` and update config

Usage:
    python reembed.py              # run continuously
    python reembed.py --status     # check progress only

Resume: safe to stop and restart — skips chunks where embedding_large IS NOT NULL.
"""
import sys
import time
import argparse

from api.db import get_db, query_one, query_all
from api.embeddings import get_client
from api.config import EMBEDDING_DIMENSIONS

NEW_MODEL = "text-embedding-3-large"
BATCH_SIZE = 100  # chunks per OpenAI API call
COMMIT_EVERY = 50  # batches per DB commit


def ensure_column():
    """Add embedding_large column if it doesn't exist."""
    row = query_one("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'judgment_chunks' AND column_name = 'embedding_large'
    """)
    if row:
        print("[OK] embedding_large column already exists")
        return
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                ALTER TABLE judgment_chunks
                ADD COLUMN embedding_large vector(1536)
            """)
    print("[OK] Added embedding_large vector(1536) column")


def get_status():
    """Print progress stats."""
    total = query_one("SELECT COUNT(*) as c FROM judgment_chunks")["c"]
    done = query_one("SELECT COUNT(*) as c FROM judgment_chunks WHERE embedding_large IS NOT NULL")["c"]
    remaining = total - done
    pct = (done / total * 100) if total else 0
    print(f"Total chunks:  {total:,}")
    print(f"Re-embedded:   {done:,} ({pct:.1f}%)")
    print(f"Remaining:     {remaining:,}")
    return total, done, remaining


def fetch_batch():
    """Fetch a batch of chunks that need re-embedding."""
    return query_all("""
        SELECT id, chunk_text FROM judgment_chunks
        WHERE embedding_large IS NULL
          AND length(chunk_text) >= 1
        ORDER BY id
        LIMIT %s
    """, (BATCH_SIZE,))


def embed_and_store(batch_num):
    """Embed one batch and store results."""
    rows = fetch_batch()
    if not rows:
        return 0

    ids = [r["id"] for r in rows]
    texts = [r["chunk_text"] if r["chunk_text"] else " " for r in rows]  # avoid empty strings

    # Call OpenAI with retries
    for attempt in range(5):
        try:
            response = get_client().embeddings.create(
                model=NEW_MODEL,
                input=texts,
                dimensions=EMBEDDING_DIMENSIONS,
            )
            embeddings = {d.index: d.embedding for d in response.data}
            break
        except Exception as e:
            wait = 2 ** attempt * 5
            print(f"  [RETRY {attempt+1}/5] API error: {e} — waiting {wait}s")
            time.sleep(wait)
    else:
        print(f"  [FAIL] Batch {batch_num} failed after 5 retries, skipping")
        return -1

    # Store in DB: single UPDATE with unnest (1 round-trip instead of 100)
    vec_strs = ["[" + ",".join(str(x) for x in embeddings[idx]) + "]" for idx in range(len(ids))]
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE judgment_chunks
                SET embedding_large = data.vec::vector
                FROM (
                    SELECT unnest(%s::int[]) AS id, unnest(%s::text[]) AS vec
                ) AS data
                WHERE judgment_chunks.id = data.id
                """,
                (ids, vec_strs),
            )

    return len(ids)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--status", action="store_true", help="Only show progress")
    parser.add_argument("--max-batches", type=int, default=0, help="Stop after N batches (0 = unlimited)")
    args = parser.parse_args()

    ensure_column()

    if args.status:
        get_status()
        return

    print(f"\nStarting re-embedding with {NEW_MODEL} (dim={EMBEDDING_DIMENSIONS})")
    print(f"Batch size: {BATCH_SIZE}\n")

    total, done, _ = get_status()
    if done == total:
        print("\n[DONE] All chunks already re-embedded!")
        return

    start_time = time.time()
    batch_num = 0
    processed = 0

    while True:
        if args.max_batches and batch_num >= args.max_batches:
            print(f"\n[STOP] Reached max batches ({args.max_batches})")
            break

        result = embed_and_store(batch_num)
        if result == 0:
            print("\n[DONE] All chunks re-embedded!")
            break
        if result == -1:
            batch_num += 1
            continue

        batch_num += 1
        processed += result
        done += result

        elapsed = time.time() - start_time
        rate = processed / elapsed if elapsed > 0 else 0
        eta_min = (total - done) / rate / 60 if rate > 0 else 0
        pct = done / total * 100

        print(f"  Batch {batch_num}: {done:,}/{total:,} ({pct:.1f}%) — {rate:.0f} chunks/s — ETA: {eta_min:.0f} min")

    print(f"\nFinal stats:")
    print(f"  Batches: {batch_num}")
    print(f"  Processed: {processed:,}")
    print(f"  Time: {(time.time() - start_time)/60:.1f} min")
    get_status()


if __name__ == "__main__":
    main()
