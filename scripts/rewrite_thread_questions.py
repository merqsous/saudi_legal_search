"""Rewrite raw community thread questions into formal Saudi-register questions.

Reads legal_threads rows where formal_question IS NULL, sends batches of
questions to gpt-4o-mini, and stores the rewritten question in
formal_question. Resumable — safe to interrupt and re-run; rows that fail
keep NULL so the API/frontend fall back to canonical_question.

Usage: ./venv/bin/python3 scripts/rewrite_thread_questions.py
"""

import json
import sys
import time

sys.path.insert(0, ".")
from api.db import get_db, query_all  # noqa: E402
from api.embeddings import get_client  # noqa: E402

BATCH = 20
MODEL = "gpt-4o-mini"

PROMPT = """أعد صياغة كل سؤال من الأسئلة التالية إلى سؤال قانوني رسمي واضح.

القواعد:
- احذف التحيات والمقدمات (السلام عليكم، الله يعطيكم العافية...) والحشو.
- حافظ على النكهة السعودية النظامية: المصطلحات الرسمية المعتمدة (ناجز، إيجار، المحكمة العامة، وزارة الموارد البشرية، طلب تنفيذ، صحيفة دعوى...).
- اجعل الناتج سؤالاً واحداً مباشراً يبدأ بـ "ما" أو "كيف" أو "هل" أو "متى" متى أمكن.
- لا تغيّر المعنى القانوني ولا تضف معلومات غير موجودة في السؤال الأصلي.
- إن كان السؤال الأصلي رداً قصيراً أو غير مفهوم (مثل "المعاملات أو العملات؟") أعده كما هو أو حسّن صياغته فقط.
- أخرج JSON فقط بهذا الشكل: {"items": [{"i": <الفهرس>, "q": "<السؤال المُعاد صياغته>"}]}

الأسئلة:
{questions}"""


def rewrite_batch(rows):
    """One LLM call for a batch; returns {id: formal_question}."""
    qlist = "\n".join(f"[{i}] {r['canonical_question'][:400]}" for i, r in enumerate(rows))
    resp = get_client().chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": PROMPT.replace("{questions}", qlist)}],
        temperature=0.2,
        max_tokens=2500,
        response_format={"type": "json_object"},
    )
    data = json.loads(resp.choices[0].message.content)
    out = {}
    for item in data.get("items", []):
        i = item.get("i")
        q = (item.get("q") or "").strip()
        if isinstance(i, int) and 0 <= i < len(rows) and q:
            out[rows[i]["id"]] = q[:500]
    return out


def main():
    total_done = 0
    while True:
        rows = query_all("""
            SELECT id, canonical_question FROM legal_threads
            WHERE formal_question IS NULL AND canonical_question IS NOT NULL
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
        # Rows the model skipped get their canonical text so the loop can't stall.
        for r in rows:
            rewritten.setdefault(r["id"], r["canonical_question"][:500])
        with get_db() as conn:
            with conn.cursor() as cur:
                for tid, fq in rewritten.items():
                    cur.execute(
                        "UPDATE legal_threads SET formal_question = %s WHERE id = %s",
                        (fq, tid),
                    )
            conn.commit()
        total_done += len(rewritten)
        print(f"rewritten: {total_done}")
    print("DONE")


if __name__ == "__main__":
    main()
