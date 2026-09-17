from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from api.db import query_all, query_one, get_db
from api.routes.auth import get_session, normalize_phone

router = APIRouter()


def init_firm_tables():
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS firms (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(200) NOT NULL,
                    owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS firm_members (
                    id SERIAL PRIMARY KEY,
                    firm_id INTEGER NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    role VARCHAR(20) NOT NULL DEFAULT 'member',
                    created_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(firm_id, user_id)
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS firm_invitations (
                    id SERIAL PRIMARY KEY,
                    firm_id INTEGER NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
                    phone VARCHAR(15) NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(firm_id, phone)
                );
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_firm_members_user_id ON firm_members(user_id);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_firm_invitations_phone ON firm_invitations(phone);")
            # Firm sharing column on user_cases (after firms table exists)
            try:
                cur.execute("ALTER TABLE user_cases ADD COLUMN IF NOT EXISTS firm_id INTEGER REFERENCES firms(id) ON DELETE SET NULL")
            except Exception:
                pass
            cur.close()
    except Exception as e:
        import logging
        logging.error(f"init_firm_tables failed: {e}")


def _get_user_from_auth(authorization: str | None) -> int | None:
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "")
    session = get_session(token)
    return session["user_id"] if session else None


def _get_my_firm(user_id: int) -> dict | None:
    return query_one(
        """SELECT f.id, f.name, f.owner_user_id, f.created_at, fm.role AS my_role
           FROM firm_members fm
           JOIN firms f ON fm.firm_id = f.id
           WHERE fm.user_id = %s;""",
        [user_id],
    )


def accept_pending_invitations(phone: str, user_id: int):
    """Called at signup: add the new user to any firm that invited their phone."""
    try:
        invites = query_all(
            "SELECT firm_id FROM firm_invitations WHERE phone = %s;",
            [phone],
        )
        for inv in invites:
            with get_db() as conn:
                cur = conn.cursor()
                cur.execute(
                    """INSERT INTO firm_members (firm_id, user_id, role)
                       VALUES (%s, %s, 'member') ON CONFLICT DO NOTHING;""",
                    (inv["firm_id"], user_id),
                )
                cur.execute("DELETE FROM firm_invitations WHERE firm_id = %s AND phone = %s;", (inv["firm_id"], phone))
                cur.close()
    except Exception as e:
        print(f"[FIRM_INVITE] Auto-accept failed: {e}")


class FirmCreate(BaseModel):
    name: str


class InviteRequest(BaseModel):
    phone: str


@router.get("/firm")
def get_my_firm(authorization: str = Header(None)):
    """Get my firm with members and pending invitations."""
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")

    firm = _get_my_firm(user_id)
    if not firm:
        return {"firm": None}

    members = query_all(
        """SELECT u.id, u.first_name, u.last_name, u.phone, fm.role, fm.created_at
           FROM firm_members fm JOIN users u ON fm.user_id = u.id
           WHERE fm.firm_id = %s ORDER BY fm.created_at ASC;""",
        [firm["id"]],
    )
    invitations = query_all(
        "SELECT id, phone, created_at FROM firm_invitations WHERE firm_id = %s ORDER BY created_at ASC;",
        [firm["id"]],
    )
    return {
        "firm": dict(firm),
        "members": [dict(m) for m in members],
        "invitations": [dict(i) for i in invitations],
    }


@router.post("/firm")
def create_firm(req: FirmCreate, authorization: str = Header(None)):
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")
    if not req.name or not req.name.strip():
        raise HTTPException(status_code=400, detail="اسم المكتب مطلوب")

    if _get_my_firm(user_id):
        raise HTTPException(status_code=400, detail="أنت عضو في مكتب بالفعل")

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO firms (name, owner_user_id) VALUES (%s, %s) RETURNING id;",
            (req.name.strip(), user_id),
        )
        firm_id = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO firm_members (firm_id, user_id, role) VALUES (%s, %s, 'owner');",
            (firm_id, user_id),
        )
        cur.close()
    return {"status": "ok", "firm_id": firm_id}


@router.post("/firm/invite")
def invite_member(req: InviteRequest, authorization: str = Header(None)):
    """Invite a lawyer by phone. If registered, they join immediately; otherwise the invitation waits for signup."""
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")

    firm = _get_my_firm(user_id)
    if not firm:
        raise HTTPException(status_code=400, detail="ليس لديك مكتب")

    phone = normalize_phone(req.phone)
    if not phone:
        raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح. يجب أن يبدأ بـ 05")

    if phone == query_one("SELECT phone FROM users WHERE id = %s;", [user_id])["phone"]:
        raise HTTPException(status_code=400, detail="لا يمكنك دعوة نفسك")

    target = query_one("SELECT id FROM users WHERE phone = %s;", [phone])
    if target:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO firm_members (firm_id, user_id, role) VALUES (%s, %s, 'member')
                   ON CONFLICT (firm_id, user_id) DO NOTHING;""",
                (firm["id"], target["id"]),
            )
            cur.close()
        return {"status": "ok", "joined": True}

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO firm_invitations (firm_id, phone) VALUES (%s, %s) ON CONFLICT DO NOTHING;",
            (firm["id"], phone),
        )
        cur.close()
    return {"status": "ok", "joined": False}


@router.delete("/firm/members/{member_user_id}")
def remove_member(member_user_id: int, authorization: str = Header(None)):
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")

    firm = _get_my_firm(user_id)
    if not firm or firm["owner_user_id"] != user_id:
        raise HTTPException(status_code=403, detail="مالك المكتب فقط يمكنه إزالة الأعضاء")

    if member_user_id == user_id:
        raise HTTPException(status_code=400, detail="لا يمكنك إزالة نفسك — استخدم حل العضوية")

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM firm_members WHERE firm_id = %s AND user_id = %s;", (firm["id"], member_user_id))
        cur.close()
    return {"status": "ok"}


@router.delete("/firm/invitations/{invitation_id}")
def cancel_invitation(invitation_id: int, authorization: str = Header(None)):
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")

    firm = _get_my_firm(user_id)
    if not firm:
        raise HTTPException(status_code=400, detail="ليس لديك مكتب")

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM firm_invitations WHERE id = %s AND firm_id = %s;", (invitation_id, firm["id"]))
        cur.close()
    return {"status": "ok"}


@router.post("/firm/leave")
def leave_firm(authorization: str = Header(None)):
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")

    firm = _get_my_firm(user_id)
    if not firm:
        raise HTTPException(status_code=400, detail="ليس لديك مكتب")

    if firm["owner_user_id"] == user_id:
        raise HTTPException(status_code=400, detail="مالك المكتب لا يمكنه المغادرة — يجب حذف المكتب أو نقل الملكية")

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM firm_members WHERE firm_id = %s AND user_id = %s;", (firm["id"], user_id))
        cur.close()
    return {"status": "ok"}
