"""Complete the JSON-chunk cleanup.

Findings: 4,523 affected judgments each have exactly ONE chunk starting with '{'
(the scraper's page-metadata JSON) among otherwise clean chunks. Two kinds:
  - ~3,350 pure JSON fragments (no judgment text) -> DELETE (content lives in sibling chunks)
  - ~1,173 contain the judgment's opening text inside a TRUNCATED JSON string
    ("full_text": "..." cut at the 2500-char chunk limit) -> extract the text
    after the full_text marker, unescape it, save as the chunk text.

Both kinds: embedding_large is nulled so the re-embed pass re-embeds clean text
(or the row is deleted entirely).
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from api.db import get_db, query_one
from api.routes.search import sanitize_chunk_text

FULL_TEXT_MARKER = '"full_text": "'


def unescape_json_fragment(s: str) -> str:
    """Unescape a fragment of a JSON string (truncated, so not parseable)."""
    s = s.replace("\\n", "\n")
    s = s.replace("\\t", "\t")
    s = s.replace('\\"', '"')
    s = s.replace("\\\\", "\\")
    return s


def run():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT id, chunk_text FROM judgment_chunks
                   WHERE chunk_text LIKE '{%' ORDER BY id"""
            )
            rows = cur.fetchall()

            deleted = 0
            recovered = 0
            for cid, text in rows:
                if FULL_TEXT_MARKER in text:
                    # Extract judgment text trapped inside the truncated JSON string
                    after = text.split(FULL_TEXT_MARKER, 1)[1]
                    # Cut at the next unescaped field separator if present
                    m = re.search(r'(?<!\\)",\s*"', after)
                    if m:
                        after = after[: m.start()]
                    cleaned = sanitize_chunk_text(unescape_json_fragment(after))
                    if cleaned and len(cleaned) > 100:
                        cur.execute(
                            "UPDATE judgment_chunks SET chunk_text = %s, embedding_large = NULL WHERE id = %s",
                            (cleaned, cid),
                        )
                        recovered += 1
                        continue
                # Pure JSON fragment — content exists in sibling chunks: delete
                cur.execute("DELETE FROM judgment_chunks WHERE id = %s", (cid,))
                deleted += 1

            print(f"Recovered text chunks: {recovered} (embedding_large nulled)")
            print(f"Deleted pure-JSON chunks: {deleted}")

    left = query_one("SELECT COUNT(*) AS c FROM judgment_chunks WHERE chunk_text LIKE '{%'")["c"]
    print(f"Remaining JSON-prefixed chunks: {left}")


if __name__ == "__main__":
    run()
