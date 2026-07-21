from fastapi import APIRouter, Header, HTTPException
from api.db import query_all, query_one, get_db
from api.routes.auth import get_session

router = APIRouter()


def _get_user_from_auth(authorization: str | None) -> int | None:
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "")
    session = get_session(token)
    return session["user_id"] if session else None


@router.get("/favorites")
def list_favorites(authorization: str = Header(None)):
    """List all favorited judgments for the authenticated user."""
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")

    rows = query_all(
        """
        SELECT f.judgment_id, f.favorited_at,
               j.judgment_number, j.judgment_year, j.judgment_date_hijri,
               j.judgment_type, j.details_url,
               c.case_number, c.case_year,
               ct.name_ar AS court_type, ct.code AS court_type_code,
               l.city_ar AS city,
               cl.name_ar AS court_level, cl.code AS court_level_code
        FROM favorites f
        JOIN judgments j ON f.judgment_id = j.id
        LEFT JOIN cases c ON j.case_id = c.id
        LEFT JOIN court_types ct ON c.court_type_id = ct.id
        LEFT JOIN locations l ON c.location_id = l.id
        LEFT JOIN court_levels cl ON j.court_level_id = cl.id
        WHERE f.user_id = %s
        ORDER BY f.favorited_at DESC;
        """,
        [user_id],
    )
    return {"favorites": [dict(r) for r in rows]}


@router.post("/favorites/{judgment_id}")
def add_favorite(judgment_id: int, authorization: str = Header(None)):
    """Add a judgment to favorites."""
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO favorites (user_id, judgment_id) VALUES (%s, %s) ON CONFLICT DO NOTHING;",
            [user_id, judgment_id],
        )
        cur.close()
    return {"status": "ok"}


@router.delete("/favorites/{judgment_id}")
def remove_favorite(judgment_id: int, authorization: str = Header(None)):
    """Remove a judgment from favorites."""
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM favorites WHERE user_id = %s AND judgment_id = %s;",
            [user_id, judgment_id],
        )
        cur.close()
    return {"status": "ok"}


@router.get("/favorites/check/{judgment_id}")
def check_favorite(judgment_id: int, authorization: str = Header(None)):
    """Check if a specific judgment is favorited by the user."""
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        return {"favorited": False}

    row = query_one(
        "SELECT 1 FROM favorites WHERE user_id = %s AND judgment_id = %s;",
        [user_id, judgment_id],
    )
    return {"favorited": row is not None}
