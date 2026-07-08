import re
import psycopg2

AR_TO_EN = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")

def normalize_digits(s):
    return s.translate(AR_TO_EN).strip() if s else None

def extract_judgment_number(text):
    if not text:
        return None

    patterns = [
        r"رقم الحكم:\s*([0-9٠-٩]{8,})",
        r"رقم الحكم\s*[:：]\s*([0-9٠-٩]{8,})",
        r"الحكم المستأنف رقم\s*\(?([0-9٠-٩]{8,})\)?",
        r"الحكم رقم\s*\(?([0-9٠-٩]{8,})\)?",
    ]

    for p in patterns:
        m = re.search(p, text)
        if m:
            return normalize_digits(m.group(1))

    return None

conn = psycopg2.connect(
    dbname="saudi_cases",
    user="moaztalal",
    host="localhost",
    port="5432"
)

cur = conn.cursor()

cur.execute("""
SELECT id, judgment_number, full_text
FROM judgments
WHERE judgment_number IS NULL
   OR length(judgment_number) < 8;
""")

rows = cur.fetchall()
fixed = 0
not_fixed = 0

for row_id, old_num, text in rows:
    new_num = extract_judgment_number(text)

    if not new_num:
        not_fixed += 1
        print("Could not fix:", row_id, old_num)
        continue

    cur.execute("""
        SELECT id FROM judgments
        WHERE judgment_number = %s
          AND id <> %s;
    """, (new_num, row_id))

    duplicate = cur.fetchone()

    if duplicate:
        not_fixed += 1
        print("Duplicate target, skipped:", row_id, old_num, "->", new_num)
        continue

    cur.execute("""
        UPDATE judgments
        SET judgment_number = %s
        WHERE id = %s;
    """, (new_num, row_id))

    fixed += 1
    print("Fixed:", row_id, old_num, "->", new_num)

conn.commit()
cur.close()
conn.close()

print("Done")
print("Fixed:", fixed)
print("Not fixed:", not_fixed)
