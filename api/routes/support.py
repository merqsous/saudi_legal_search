from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from api.db import query_one, query_all, get_db
from api.routes.auth import get_session, ADMIN_PHONE, normalize_phone
import secrets

router = APIRouter()


def init_support_tables():
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS support_tickets (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    subject VARCHAR(200) NOT NULL,
                    message TEXT NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'open',
                    chat_token VARCHAR(64),
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS support_replies (
                    id SERIAL PRIMARY KEY,
                    ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    message TEXT NOT NULL,
                    is_admin BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_support_replies_ticket_id ON support_replies(ticket_id);
            """)
            # Add chat_token column if missing (for existing table from older deploy)
            try:
                cur.execute("ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS chat_token VARCHAR(64)")
            except Exception:
                pass
            # Create chat_token index only if column exists
            try:
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_support_tickets_chat_token ON support_tickets(chat_token);
                """)
            except Exception:
                pass
            cur.close()
    except Exception as e:
        import logging
        logging.error(f"init_support_tables failed: {e}")


def _require_auth(authorization: str) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="غير مصرح")
    token = authorization.replace("Bearer ", "")
    session = get_session(token)
    if not session:
        raise HTTPException(status_code=401, detail="جلسة غير صالحة")
    return session


def _require_admin(authorization: str) -> dict:
    session = _require_auth(authorization)
    if session["phone"] != ADMIN_PHONE:
        raise HTTPException(status_code=403, detail="غير مصرح")
    return session


class CreateTicketRequest(BaseModel):
    subject: str
    message: str


class ReplyRequest(BaseModel):
    message: str


@router.post("/support/ticket")
def create_ticket(req: CreateTicketRequest, authorization: str = Header(None)):
    """Create a new support ticket."""
    session = _require_auth(authorization)
    subject = req.subject.strip()
    message = req.message.strip()
    if not subject or not message:
        raise HTTPException(status_code=400, detail="الموضوع والرسالة مطلوبان")
    if len(subject) > 200:
        raise HTTPException(status_code=400, detail="الموضوع طويل جداً")

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO support_tickets (user_id, subject, message, status)
               VALUES (%s, %s, %s, 'open') RETURNING id;""",
            (session["user_id"], subject, message),
        )
        ticket_id = cur.fetchone()[0]
        cur.close()

    return {"status": "ok", "ticket_id": ticket_id}


@router.get("/support/tickets")
def get_my_tickets(authorization: str = Header(None)):
    """Get all tickets for the authenticated user."""
    session = _require_auth(authorization)
    rows = query_all(
        """SELECT id, subject, message, status, created_at, updated_at
           FROM support_tickets WHERE user_id = %s ORDER BY created_at DESC""",
        [session["user_id"]],
    )
    return {"tickets": [dict(r) for r in rows]}


@router.get("/support/ticket/{ticket_id}")
def get_ticket(ticket_id: int, authorization: str = Header(None)):
    """Get a single ticket with its replies."""
    session = _require_auth(authorization)
    ticket = query_one(
        "SELECT * FROM support_tickets WHERE id = %s AND user_id = %s",
        [ticket_id, session["user_id"]],
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="التذكرة غير موجودة")
    replies = query_all(
        """SELECT id, message, is_admin, created_at
           FROM support_replies WHERE ticket_id = %s ORDER BY created_at ASC""",
        [ticket_id],
    )
    return {"ticket": dict(ticket), "replies": [dict(r) for r in replies]}


@router.post("/support/ticket/{ticket_id}/reply")
def user_reply(ticket_id: int, req: ReplyRequest, authorization: str = Header(None)):
    """User replies to their own ticket."""
    session = _require_auth(authorization)
    message = req.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="الرسالة مطلوبة")

    ticket = query_one(
        "SELECT id, status FROM support_tickets WHERE id = %s AND user_id = %s",
        [ticket_id, session["user_id"]],
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="التذكرة غير موجودة")

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO support_replies (ticket_id, user_id, message, is_admin)
               VALUES (%s, %s, %s, FALSE);""",
            (ticket_id, session["user_id"], message),
        )
        cur.execute(
            "UPDATE support_tickets SET status = 'open', updated_at = NOW() WHERE id = %s;",
            [ticket_id],
        )
        cur.close()

    return {"status": "ok"}


# --- Admin endpoints ---

@router.get("/support/admin/tickets")
def admin_get_tickets(
    status: str = "all",
    authorization: str = Header(None),
):
    """Admin: get all tickets, optionally filtered by status."""
    _require_admin(authorization)

    if status and status != "all":
        rows = query_all(
            """SELECT t.id, t.subject, t.message, t.status, t.created_at, t.updated_at,
                      u.first_name, u.last_name, u.phone
               FROM support_tickets t
               JOIN users u ON t.user_id = u.id
               WHERE t.status = %s
               ORDER BY t.updated_at DESC""",
            [status],
        )
    else:
        rows = query_all(
            """SELECT t.id, t.subject, t.message, t.status, t.created_at, t.updated_at,
                      u.first_name, u.last_name, u.phone
               FROM support_tickets t
               JOIN users u ON t.user_id = u.id
               ORDER BY t.updated_at DESC""",
        )

    return {"tickets": [dict(r) for r in rows]}


@router.get("/support/admin/ticket/{ticket_id}")
def admin_get_ticket(ticket_id: int, authorization: str = Header(None)):
    """Admin: get a single ticket with replies."""
    _require_admin(authorization)
    ticket = query_one(
        """SELECT t.*, u.first_name, u.last_name, u.phone
           FROM support_tickets t
           JOIN users u ON t.user_id = u.id
           WHERE t.id = %s""",
        [ticket_id],
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="التذكرة غير موجودة")
    replies = query_all(
        """SELECT id, message, is_admin, created_at
           FROM support_replies WHERE ticket_id = %s ORDER BY created_at ASC""",
        [ticket_id],
    )
    return {"ticket": dict(ticket), "replies": [dict(r) for r in replies]}


@router.post("/support/admin/ticket/{ticket_id}/reply")
def admin_reply(ticket_id: int, req: ReplyRequest, authorization: str = Header(None)):
    """Admin: reply to a ticket and set status to answered."""
    session = _require_admin(authorization)
    message = req.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="الرسالة مطلوبة")

    ticket = query_one("SELECT id FROM support_tickets WHERE id = %s", [ticket_id])
    if not ticket:
        raise HTTPException(status_code=404, detail="التذكرة غير موجودة")

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO support_replies (ticket_id, user_id, message, is_admin)
               VALUES (%s, %s, %s, TRUE);""",
            (ticket_id, session["user_id"], message),
        )
        cur.execute(
            "UPDATE support_tickets SET status = 'answered', updated_at = NOW() WHERE id = %s;",
            [ticket_id],
        )
        cur.close()

    return {"status": "ok"}


@router.post("/support/admin/ticket/{ticket_id}/close")
def admin_close_ticket(ticket_id: int, authorization: str = Header(None)):
    """Admin: close a ticket."""
    _require_admin(authorization)
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE support_tickets SET status = 'closed', updated_at = NOW() WHERE id = %s;",
            [ticket_id],
        )
        cur.close()
    return {"status": "ok"}


# --- Chat endpoints (for floating widget, supports anonymous users) ---

class StartChatRequest(BaseModel):
    phone: str
    first_name: str
    last_name: str
    message: str


class ChatReplyRequest(BaseModel):
    message: str


@router.post("/support/chat/start")
def start_chat(req: StartChatRequest):
    """Start a chat conversation. Works for non-registered users.
    Creates a user if phone doesn't exist, then creates a ticket with a chat_token."""
    phone = normalize_phone(req.phone)
    if not phone:
        raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح. يجب أن يبدأ بـ 05 ويتكون من 9 أرقام")
    if not req.first_name.strip() or not req.last_name.strip():
        raise HTTPException(status_code=400, detail="الاسم الأول والأخير مطلوبان")
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="الرسالة مطلوبة")

    # Find or create user
    user = query_one("SELECT id FROM users WHERE phone = %s", [phone])
    if user:
        user_id = user["id"]
    else:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO users (phone, first_name, last_name) VALUES (%s, %s, %s) RETURNING id",
                (phone, req.first_name.strip(), req.last_name.strip()),
            )
            user_id = cur.fetchone()[0]
            cur.close()

    chat_token = secrets.token_urlsafe(32)

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO support_tickets (user_id, subject, message, status, chat_token)
               VALUES (%s, %s, %s, 'open', %s) RETURNING id;""",
            (user_id, "محادثة دعم", req.message.strip(), chat_token),
        )
        ticket_id = cur.fetchone()[0]
        cur.close()

    return {"status": "ok", "chat_token": chat_token, "ticket_id": ticket_id}


@router.get("/support/chat/{chat_token}")
def get_chat(chat_token: str):
    """Get chat conversation by token (for anonymous users)."""
    ticket = query_one(
        "SELECT id, subject, message, status, created_at, updated_at FROM support_tickets WHERE chat_token = %s",
        [chat_token],
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="المحادثة غير موجودة")
    replies = query_all(
        """SELECT id, message, is_admin, created_at
           FROM support_replies WHERE ticket_id = %s ORDER BY created_at ASC""",
        [ticket["id"]],
    )
    return {"ticket": dict(ticket), "replies": [dict(r) for r in replies]}


@router.post("/support/chat/{chat_token}/reply")
def chat_reply(chat_token: str, req: ChatReplyRequest):
    """Reply to a chat conversation (anonymous user)."""
    message = req.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="الرسالة مطلوبة")

    ticket = query_one(
        "SELECT id, user_id, status FROM support_tickets WHERE chat_token = %s",
        [chat_token],
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="المحادثة غير موجودة")

    if ticket["status"] == "closed":
        raise HTTPException(status_code=400, detail="المحادثة مغلقة")

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO support_replies (ticket_id, user_id, message, is_admin)
               VALUES (%s, %s, %s, FALSE);""",
            (ticket["id"], ticket["user_id"], message),
        )
        cur.execute(
            "UPDATE support_tickets SET status = 'open', updated_at = NOW() WHERE id = %s;",
            [ticket["id"]],
        )
        cur.close()

    return {"status": "ok"}
