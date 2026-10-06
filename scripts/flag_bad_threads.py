"""Flag junk threads in legal_threads — answers that don't answer.

Some imported threads aren't real Q&As: "تواصل خاص" replies, service
requests (احتاج شخص يراجع المحكمة), off-topic answers, courtesy-only
responses. Classifies each (question, answer) pair with gpt-4o-mini and
writes quality_ok = true/false. Search excludes quality_ok = false;
NULL rows are unreviewed and still shown.

Resumable — re-run fills NULL rows only.

Usage: ./venv/bin/python3 scripts/flag_bad_threads.py
"""

import json
import sys
import time

sys.path.insert(0, ".")
from api.db import get_db, query_all  # noqa: E402
from api.embeddings import get_client  # noqa: E402

BATCH = 25
MODEL = "gpt-4o-mini"

PROMPT = """لكل زوج (سؤال/إجابة) أدناه، حدد هل الإجابة تقدّم رداً حقيقياً ومفيداً على السؤال.

الزوج يكون غير مفيد (ok=false) إذا تحقق أي من التالي:
- الإجابة لا ترد على السؤال أصلاً أو خارجة عن موضوعه تماماً
- الإجابة مجرد طلب تواصل أو خدمة (مثل "تعال خاص"، "راسلني على الواتس"، "أرسل لي")
- الإجابة سؤال آخر أو مجاملة بدون محتوى (مثل "جزاك الله خير" فقط)
- الإجابة لا تحمل أي معلومة قانونية أو إجرائية مفيدة
- السؤال نفسه طلب خدمة شخصية وليس سؤالاً قانونياً/إجرائياً (مثل "احتاج شخص يراجع المحكمة بدلاً عني")

كن متساهلاً: الإجابة القصيرة أو الجزئية تبقى ok=true ما دامت تحاول الرد فعلياً على السؤال.

أخرج JSON فقط: {"items": [{"i": <الفهرس>, "ok": true|false}]}

الأزواج:
{pairs}"""


def classify_batch(rows):
    """One LLM call per batch; returns {id: bool}."""
    pairs = "\n".join(
        f"[{i}] سؤال: {r['canonical_question'][:250]}\n    إجابة: {r['consolidated_answer'][:400]}"
        for i, r in enumerate(rows)
    )
    resp = get_client().chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": PROMPT.replace("{pairs}", pairs)}],
        temperature=0.0,
        max_tokens=1200,
        response_format={"type": "json_object"},
    )
    data = json.loads(resp.choices[0].message.content)
    out = {}
    for item in data.get("items", []):
        i = item.get("i")
        ok = item.get("ok")
        if isinstance(i, int) and 0 <= i < len(rows) and isinstance(ok, bool):
            out[rows[i]["id"]] = ok
    return out


def main():
    total_done = 0
    flagged = 0
    while True:
        rows = query_all("""
            SELECT id, canonical_question, consolidated_answer FROM legal_threads
            WHERE quality_ok IS NULL AND canonical_question IS NOT NULL
            ORDER BY id LIMIT %s
        """, [BATCH])
        if not rows:
            break
        try:
            verdicts = classify_batch(rows)
        except Exception as e:
            print(f"batch failed: {e} — retrying in 10s")
            time.sleep(10)
            continue
        # Rows the model skipped default to ok so the loop can't stall.
        for r in rows:
            verdicts.setdefault(r["id"], True)
        with get_db() as conn:
            with conn.cursor() as cur:
                for tid, ok in verdicts.items():
                    cur.execute(
                        "UPDATE legal_threads SET quality_ok = %s WHERE id = %s",
                        (ok, tid),
                    )
            conn.commit()
        total_done += len(verdicts)
        flagged += sum(1 for v in verdicts.values() if not v)
        print(f"classified: {total_done} | flagged junk: {flagged}")
    print(f"DONE — flagged {flagged} junk threads")


if __name__ == "__main__":
    main()
