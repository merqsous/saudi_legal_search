from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from api.db import query_one, query_all, get_db
from api.routes.auth import get_session

router = APIRouter()


def init_case_tables():
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_cases (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title VARCHAR(200) NOT NULL,
                    client_name VARCHAR(200),
                    case_number VARCHAR(50),
                    case_year VARCHAR(10),
                    court_type VARCHAR(100),
                    city VARCHAR(100),
                    opponents VARCHAR(300),
                    status VARCHAR(20) NOT NULL DEFAULT 'active',
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS case_hearings (
                    id SERIAL PRIMARY KEY,
                    case_id INTEGER NOT NULL REFERENCES user_cases(id) ON DELETE CASCADE,
                    hearing_date DATE NOT NULL,
                    hearing_time VARCHAR(10),
                    hijri_date VARCHAR(30),
                    agenda TEXT,
                    status VARCHAR(20) NOT NULL DEFAULT 'upcoming',
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS case_judgments (
                    id SERIAL PRIMARY KEY,
                    case_id INTEGER NOT NULL REFERENCES user_cases(id) ON DELETE CASCADE,
                    judgment_id INTEGER NOT NULL REFERENCES judgments(id) ON DELETE CASCADE,
                    note TEXT,
                    added_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(case_id, judgment_id)
                );
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_user_cases_user_id ON user_cases(user_id);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_case_hearings_case_id ON case_hearings(case_id);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_case_judgments_case_id ON case_judgments(case_id);")
            cur.close()
    except Exception as e:
        import logging
        logging.error(f"init_case_tables failed: {e}")


def _get_user_from_auth(authorization: str | None) -> int | None:
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "")
    session = get_session(token)
    return session["user_id"] if session else None


def _get_case_for_user(case_id: int, user_id: int) -> dict:
    case = query_one(
        "SELECT id FROM user_cases WHERE id = %s AND user_id = %s;",
        [case_id, user_id],
    )
    if not case:
        raise HTTPException(status_code=404, detail="القضية غير موجودة")
    return case


class CaseCreate(BaseModel):
    title: str
    client_name: str | None = None
    case_number: str | None = None
    case_year: str | None = None
    court_type: str | None = None
    city: str | None = None
    opponents: str | None = None
    status: str = "active"
    notes: str | None = None


class CaseUpdate(BaseModel):
    title: str | None = None
    client_name: str | None = None
    case_number: str | None = None
    case_year: str | None = None
    court_type: str | None = None
    city: str | None = None
    opponents: str | None = None
    status: str | None = None
    notes: str | None = None


class HearingCreate(BaseModel):
    hearing_date: str
    hearing_time: str | None = None
    hijri_date: str | None = None
    agenda: str | None = None
    status: str = "upcoming"


class HearingUpdate(BaseModel):
    hearing_date: str | None = None
    hearing_time: str | None = None
    hijri_date: str | None = None
    agenda: str | None = None
    status: str | None = None


@router.get("/cases")
def list_cases(authorization: str = Header(None)):
    """List the user's cases with next hearing and judgment count."""
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")

    rows = query_all(
        """
        SELECT uc.id, uc.title, uc.client_name, uc.case_number, uc.case_year,
               uc.court_type, uc.city, uc.opponents, uc.status, uc.notes,
               uc.created_at, uc.updated_at,
               (SELECT COUNT(*) FROM case_judgments cj WHERE cj.case_id = uc.id) AS judgments_count,
               nh.hearing_date AS next_hearing_date,
               nh.hijri_date AS next_hijri_date,
               nh.agenda AS next_hearing_agenda,
               nh.hearing_time AS next_hearing_time
        FROM user_cases uc
        LEFT JOIN LATERAL (
            SELECT hearing_date, hijri_date, agenda, hearing_time
            FROM case_hearings
            WHERE case_id = uc.id AND status = 'upcoming' AND hearing_date >= CURRENT_DATE
            ORDER BY hearing_date ASC LIMIT 1
        ) nh ON true
        WHERE uc.user_id = %s
        ORDER BY nh.hearing_date ASC NULLS LAST, uc.updated_at DESC;
        """,
        [user_id],
    )
    return {"cases": [dict(r) for r in rows]}


@router.post("/cases")
def create_case(req: CaseCreate, authorization: str = Header(None)):
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")
    if not req.title or not req.title.strip():
        raise HTTPException(status_code=400, detail="عنوان القضية مطلوب")

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO user_cases
               (user_id, title, client_name, case_number, case_year, court_type, city, opponents, status, notes)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (user_id, req.title.strip(), req.client_name, req.case_number, req.case_year,
             req.court_type, req.city, req.opponents, req.status, req.notes),
        )
        case_id = cur.fetchone()[0]
        cur.close()
    return {"status": "ok", "case_id": case_id}


@router.get("/cases/{case_id}")
def get_case(case_id: int, authorization: str = Header(None)):
    """Full case detail: info, hearings, and linked judgments."""
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")
    _get_case_for_user(case_id, user_id)

    case = query_one(
        """SELECT id, title, client_name, case_number, case_year, court_type, city,
                  opponents, status, notes, created_at, updated_at
           FROM user_cases WHERE id = %s;""",
        [case_id],
    )

    hearings = query_all(
        """SELECT id, hearing_date, hearing_time, hijri_date, agenda, status, created_at
           FROM case_hearings WHERE case_id = %s
           ORDER BY hearing_date DESC;""",
        [case_id],
    )

    judgments = query_all(
        """SELECT cj.judgment_id, cj.note, cj.added_at,
                  j.judgment_number, j.judgment_year, j.judgment_date_hijri,
                  j.judgment_type, j.details_url,
                  c.case_number AS source_case_number, c.case_year AS source_case_year,
                  ct.name_ar AS court_type, l.city_ar AS city,
                  cl.name_ar AS court_level
           FROM case_judgments cj
           JOIN judgments j ON cj.judgment_id = j.id
           LEFT JOIN cases c ON j.case_id = c.id
           LEFT JOIN court_types ct ON c.court_type_id = ct.id
           LEFT JOIN locations l ON c.location_id = l.id
           LEFT JOIN court_levels cl ON j.court_level_id = cl.id
           WHERE cj.case_id = %s
           ORDER BY cj.added_at DESC;""",
        [case_id],
    )

    return {
        "case": dict(case),
        "hearings": [dict(h) for h in hearings],
        "judgments": [dict(j) for j in judgments],
    }


@router.put("/cases/{case_id}")
def update_case(case_id: int, req: CaseUpdate, authorization: str = Header(None)):
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")
    _get_case_for_user(case_id, user_id)

    fields = {
        "title": req.title, "client_name": req.client_name, "case_number": req.case_number,
        "case_year": req.case_year, "court_type": req.court_type, "city": req.city,
        "opponents": req.opponents, "status": req.status, "notes": req.notes,
    }
    updates = [f"{k} = %s" for k, v in fields.items() if v is not None]
    params = [v for v in fields.values() if v is not None]
    if not updates:
        raise HTTPException(status_code=400, detail="لا توجد بيانات للتحديث")

    params.extend([case_id])
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            f"UPDATE user_cases SET {', '.join(updates)}, updated_at = NOW() WHERE id = %s;",
            params,
        )
        cur.close()
    return {"status": "ok"}


@router.delete("/cases/{case_id}")
def delete_case(case_id: int, authorization: str = Header(None)):
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")
    _get_case_for_user(case_id, user_id)

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM user_cases WHERE id = %s;", [case_id])
        cur.close()
    return {"status": "ok"}


@router.post("/cases/{case_id}/hearings")
def add_hearing(case_id: int, req: HearingCreate, authorization: str = Header(None)):
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")
    _get_case_for_user(case_id, user_id)
    if not req.hearing_date:
        raise HTTPException(status_code=400, detail="تاريخ الجلسة مطلوب")

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO case_hearings (case_id, hearing_date, hearing_time, hijri_date, agenda, status)
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
            (case_id, req.hearing_date, req.hearing_time, req.hijri_date, req.agenda, req.status),
        )
        hearing_id = cur.fetchone()[0]
        cur.execute("UPDATE user_cases SET updated_at = NOW() WHERE id = %s;", [case_id])
        cur.close()
    return {"status": "ok", "hearing_id": hearing_id}


@router.put("/cases/hearings/{hearing_id}")
def update_hearing(hearing_id: int, req: HearingUpdate, authorization: str = Header(None)):
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")

    hearing = query_one(
        """SELECT h.id FROM case_hearings h
           JOIN user_cases uc ON h.case_id = uc.id
           WHERE h.id = %s AND uc.user_id = %s;""",
        [hearing_id, user_id],
    )
    if not hearing:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")

    fields = {
        "hearing_date": req.hearing_date, "hearing_time": req.hearing_time,
        "hijri_date": req.hijri_date, "agenda": req.agenda, "status": req.status,
    }
    updates = [f"{k} = %s" for k, v in fields.items() if v is not None]
    params = [v for v in fields.values() if v is not None]
    if not updates:
        raise HTTPException(status_code=400, detail="لا توجد بيانات للتحديث")

    params.append(hearing_id)
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(f"UPDATE case_hearings SET {', '.join(updates)} WHERE id = %s;", params)
        cur.close()
    return {"status": "ok"}


@router.delete("/cases/hearings/{hearing_id}")
def delete_hearing(hearing_id: int, authorization: str = Header(None)):
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")

    hearing = query_one(
        """SELECT h.id FROM case_hearings h
           JOIN user_cases uc ON h.case_id = uc.id
           WHERE h.id = %s AND uc.user_id = %s;""",
        [hearing_id, user_id],
    )
    if not hearing:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM case_hearings WHERE id = %s;", [hearing_id])
        cur.close()
    return {"status": "ok"}


@router.post("/cases/{case_id}/judgments/{judgment_id}")
def link_judgment(case_id: int, judgment_id: int, authorization: str = Header(None)):
    """Link a search result judgment to a case."""
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")
    _get_case_for_user(case_id, user_id)

    judgment = query_one("SELECT id FROM judgments WHERE id = %s;", [judgment_id])
    if not judgment:
        raise HTTPException(status_code=404, detail="الحكم غير موجود")

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO case_judgments (case_id, judgment_id) VALUES (%s, %s) ON CONFLICT DO NOTHING;",
            (case_id, judgment_id),
        )
        cur.close()
    return {"status": "ok"}


@router.delete("/cases/{case_id}/judgments/{judgment_id}")
def unlink_judgment(case_id: int, judgment_id: int, authorization: str = Header(None)):
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")
    _get_case_for_user(case_id, user_id)

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM case_judgments WHERE case_id = %s AND judgment_id = %s;",
            (case_id, judgment_id),
        )
        cur.close()
    return {"status": "ok"}
