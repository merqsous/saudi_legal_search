import psycopg2

def ar_to_en_digits(s):
    if not s:
        return s
    table = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
    return s.translate(table)

conn = psycopg2.connect(
    dbname="saudi_cases",
    user="moaztalal",
    host="localhost",
    port="5432"
)

cur = conn.cursor()

cur.execute("""
    SELECT id, appealed_judgment_number
    FROM judgments
    WHERE appealed_judgment_number IS NOT NULL;
""")

for row_id, num in cur.fetchall():
    normalized = ar_to_en_digits(num).strip()
    cur.execute("""
        UPDATE judgments
        SET appealed_judgment_number = %s
        WHERE id = %s;
    """, (normalized, row_id))

conn.commit()
cur.close()
conn.close()

print("Done normalizing appealed judgment numbers.")
