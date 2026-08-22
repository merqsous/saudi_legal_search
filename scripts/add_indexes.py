from api.db import get_db

with get_db() as conn:
    cur = conn.cursor()
    cur.execute("CREATE INDEX IF NOT EXISTS idx_chunks_judgment_id ON judgment_chunks (judgment_id)")
    print("idx_chunks_judgment_id done")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_judgments_case_id ON judgments (case_id)")
    print("idx_judgments_case_id done")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_cases_location_id ON cases (location_id)")
    print("idx_cases_location_id done")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_cases_court_type_id ON cases (court_type_id)")
    print("idx_cases_court_type_id done")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_judgments_court_level_id ON judgments (court_level_id)")
    print("idx_judgments_court_level_id done")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_judgments_year ON judgments (judgment_year)")
    print("idx_judgments_year done")
