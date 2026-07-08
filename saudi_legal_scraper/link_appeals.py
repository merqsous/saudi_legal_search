import re
import psycopg2

conn = psycopg2.connect(
    dbname="saudi_cases",
    user="moaztalal",
    host="localhost",
    port="5432"
)

cur = conn.cursor()

def extract_appealed_judgment_number(text):
    patterns = [
        r"الحكم المستأنف رقم\s*\(?([0-9٠-٩]+)\)?",
        r"الحكم المستأنف\s+رقم\s*\(?([0-9٠-٩]+)\)?",
        r"الحكم الصادر فيها.*?رقم\s*\(?([0-9٠-٩]+)\)?",
        r"الحكم المستأنف رقم\s*[:：]?\s*([0-9٠-٩]+)",
    ]

    for pattern in patterns:
        m = re.search(pattern, text, re.S)
        if m:
            return m.group(1)

    return None


def detect_outcome(text):
    if "تأييد الحكم المستأنف" in text or "تأييده" in text:
        return "affirmed"

    if "نقض الحكم" in text or "إلغاء الحكم" in text:
        return "reversed"

    if "تعديل الحكم" in text:
        return "modified"

    if "قبول الاستئناف شكلاً ورفضه موضوعاً" in text:
        return "affirmed"

    return "unknown"


cur.execute("""
    SELECT id, judgment_number, full_text
    FROM judgments
    WHERE full_text IS NOT NULL
      AND (
          full_text LIKE '%محكمة الاستئناف%'
          OR full_text LIKE '%نص الاستئناف%'
          OR full_text LIKE '%الحكم المستأنف%'
      );
""")

appeals = cur.fetchall()

linked = 0
found_number = 0

for appeal_id, appeal_judgment_number, text in appeals:
    appealed_number = extract_appealed_judgment_number(text)
    outcome = detect_outcome(text)

    if appealed_number:
        found_number += 1

        cur.execute(
            "SELECT id FROM judgments WHERE judgment_number = %s",
            (appealed_number,)
        )
        parent = cur.fetchone()

        parent_id = parent[0] if parent else None

        cur.execute("""
            UPDATE judgments
            SET appealed_judgment_number = %s,
                parent_judgment_id = %s,
                appeal_outcome = %s
            WHERE id = %s;
        """, (appealed_number, parent_id, outcome, appeal_id))

        if parent_id:
            linked += 1
    else:
        cur.execute("""
            UPDATE judgments
            SET appeal_outcome = %s
            WHERE id = %s;
        """, (outcome, appeal_id))

conn.commit()

print("Appeal judgments checked:", len(appeals))
print("Appealed judgment numbers found:", found_number)
print("Appeals linked to existing first-instance judgments:", linked)

cur.close()
conn.close()
