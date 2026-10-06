"""Rewrite raw community thread answers into formal Saudi-register answers.

Same pattern as rewrite_thread_questions.py: batches of answers through
gpt-4o-mini, stored in formal_answer, resumable via NULL rows. The raw
consolidated_answer stays untouched and still feeds FTS indexing and the
expandable conversation view.

Usage: ./venv/bin/python3 scripts/rewrite_thread_answers.py
"""

import json
import sys
import time

sys.path.insert(0, ".")
from api.db import get_db, query_all  # noqa: E402
from api.embeddings import get_client  # noqa: E402

BATCH = 15
MODEL = "gpt-4o-mini"

PROMPT = """أعد صياغة كل إجابة من الإجابات التالية إلى إجابة قانونية إجرائية رسمية واضحة.

القواعد:
- اكتب بالعربية الفصحى المعتمدة في البيئة القانونية السعودية، مع الحفاظ على المصطلحات النظامية الرسمية (ناجز، إيجار، طلب تنفيذ، صحيفة دعوى، المحكمة العامة...).
- احذف التحيات والمجاملات والعبارات العامية والانفعالية.
- حافظ على المعنى والمعلومة كما هي تماماً — لا تضف معلومات قانونية أو إجرائية ولا تحذف جوهر الإجابة.
- إن كانت الإجابة خطوات أو نقاطاً، أعد صياغتها بشكل مرتب (نقاط أو ترقيم عند الحاجة).
- إن كانت الإجابة الأصلية غير مفيدة أو غير مفهومة، أعدها بحذف الحشو فقط.
- أخرج JSON فقط بهذا الشكل: {"items": [{"i": <الفهرس>, "a": "<الإجابة المُعاد صياغتها>"}]}

الإجابات:
{answers}"""


def rewrite_batch(rows):
    """One LLM call for a batch; returns {id: formal_answer}."""
    alist = "\n".join(f"[{i}] {r['consolidated_answer'][:1200]}" for i, r in enumerate(rows))
    resp = get_client().chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": PROMPT.replace("{answers}", alist)}],
        temperature=0.2,
        max_tokens=4000,
        response_format={"type": "json_object"},
    )
    data = json.loads(resp.choices[0].message.content)
    out = {}
    for item in data.get("items", []):
        i = item.get("i")
        a = (item.get("a") or "").strip()
        if isinstance(i, int) and 0 <= i < len(rows) and a:
            out[rows[i]["id"]] = a[:2000]
    return out


def main():
    total_done = 0
    while True:
        rows = query_all("""
            SELECT id, consolidated_answer FROM legal_threads
            WHERE formal_answer IS NULL AND consolidated_answer IS NOT NULL
            ORDER BY id LIMIT %s
        """, [BATCH])
        if not rows:
            break
        try:
            rewritten = rewrite_batch(rows)
        except Exception as e:
            print(f"batch failed: {e} — retrying in 10s")
            time.sleep(10)
            continue
        # Rows the model skipped get their original text so the loop can't stall.
        for r in rows:
            rewritten.setdefault(r["id"], r["consolidated_answer"][:2000])
        with get_db() as conn:
            with conn.cursor() as cur:
                for tid, fa in rewritten.items():
                    cur.execute(
                        "UPDATE legal_threads SET formal_answer = %s WHERE id = %s",
                        (fa, tid),
                    )
            conn.commit()
        total_done += len(rewritten)
        print(f"rewritten: {total_done}")
    print("DONE")


if __name__ == "__main__":
    main()
