import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager

from api.config import DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT


@contextmanager
def get_db():
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT,
    )
    conn.autocommit = True
    try:
        yield conn
    finally:
        conn.close()


def query_one(sql: str, params=None) -> dict | None:
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(sql, params)
        row = cur.fetchone()
        cur.close()
        return dict(row) if row else None


def query_all(sql: str, params=None) -> list[dict]:
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(sql, params)
        rows = cur.fetchall()
        cur.close()
        return [dict(r) for r in rows]
