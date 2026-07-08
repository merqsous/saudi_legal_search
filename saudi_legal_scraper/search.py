import os
from dotenv import load_dotenv
from openai import OpenAI
import psycopg2

load_dotenv()

client = OpenAI()

conn = psycopg2.connect(
    dbname="saudi_cases",
    user=os.getenv("USER"),
    host="localhost",
    port="5432",
)

cur = conn.cursor()

question = input("Question: ")

response = client.embeddings.create(
    model="text-embedding-3-small",
    input=question
)

embedding = response.data[0].embedding
embedding = "[" + ",".join(map(str, embedding)) + "]"

cur.execute("""
SELECT
    jc.chunk_text,
    js.section_name_ar,
    j.judgment_number,
    j.details_url,
    c.case_number,
    c.case_year,
    ct.name_ar AS court_type,
    l.city_ar AS city,
    jc.embedding <=> %s::vector AS distance
FROM judgment_chunks jc
JOIN judgments j
    ON jc.judgment_id = j.id
JOIN cases c
    ON j.case_id = c.id
LEFT JOIN judgment_sections js
    ON jc.section_id = js.id
LEFT JOIN court_types ct
    ON c.court_type_id = ct.id
LEFT JOIN locations l
    ON c.location_id = l.id
WHERE jc.embedding IS NOT NULL
  AND length(jc.chunk_text) >= 100
ORDER BY jc.embedding <=> %s::vector
LIMIT 10;
""", (embedding, embedding))

rows = cur.fetchall()

for i, row in enumerate(rows, 1):
    text, section, judgment, url, case, year, court, city, distance = row

    print("=" * 80)
    print(f"Result {i}")
    print(f"Distance : {distance:.4f}")
    print(f"Court    : {court}")
    print(f"City     : {city}")
    print(f"Case     : {case}/{year}")
    print(f"Judgment : {judgment}")
    print(f"Section  : {section}")
    print()
    print(text[:700])
    print(f"URL      : {url}")
    print()

cur.close()
conn.close()
