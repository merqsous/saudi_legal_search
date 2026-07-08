import os
import random
import time
import secrets
import urllib.parse
from fastapi import APIRouter, Query, HTTPException, Header
from pydantic import BaseModel
from api.db import query_one, query_all, get_db
from api.config import OPENAI_API_KEY

router = APIRouter()

# Twilio WhatsApp config from env
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

# Session tokens (in-memory, survives across requests)
_sessions: dict[str, dict] = {}


def init_auth_tables():
    """Create auth tables if they don't exist."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(15) UNIQUE NOT NULL,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS verification_codes (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(15) NOT NULL,
                code VARCHAR(6) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '10 minutes',
                used BOOLEAN DEFAULT FALSE
            );
        """)
        cur.close()


def normalize_phone(phone: str) -> str:
    """Normalize Saudi phone to format 9665XXXXXXXX."""
    phone = phone.strip().replace("-", "").replace(" ", "")
    if phone.startswith("00966"):
        phone = phone[5:]
    elif phone.startswith("+966"):
        phone = phone[4:]
    elif phone.startswith("966"):
        phone = phone[3:]
    elif phone.startswith("05"):
        phone = "5" + phone[2:]
    elif phone.startswith("5") and len(phone) == 9:
        pass
    else:
        return ""
    if len(phone) != 9 or not phone.startswith("5"):
        return ""
    return "966" + phone


def send_whatsapp_otp(phone: str, code: str) -> bool:
    """Send OTP via Twilio WhatsApp API. Falls back to console log if no credentials."""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        print(f"[DEV MODE] WhatsApp OTP for {phone}: {code}")
        return True

    try:
        import urllib.request
        import json as _json
        import base64

        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
        data = urllib.parse.urlencode({
            "From": TWILIO_WHATSAPP_FROM,
            "To": f"whatsapp:+{phone}",
            "Body": f"رمز التحقق الخاص بك في الباحث القانوني هو: {code}",
        }).encode()

        auth = base64.b64encode(f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}".encode()).decode()
        req = urllib.request.Request(url, data=data, method="POST")
        req.add_header("Authorization", f"Basic {auth}")

        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 201
    except Exception as e:
        print(f"WhatsApp send error: {e}")
        return False


class SendCodeRequest(BaseModel):
    phone: str


class VerifyCodeRequest(BaseModel):
    phone: str
    code: str
    first_name: str | None = None
    last_name: str | None = None


@router.post("/auth/send-code")
def send_code(req: SendCodeRequest):
    phone = normalize_phone(req.phone)
    if not phone:
        raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح. يجب أن يبدأ بـ 05 ويتكون من 9 أرقام")

    code = f"{random.randint(0, 999999):06d}"

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO verification_codes (phone, code) VALUES (%s, %s)",
            (phone, code),
        )
        cur.close()

    sent = send_whatsapp_otp(phone, code)

    if sent:
        return {"status": "ok", "message": "تم إرسال رمز التحقق عبر واتساب", "dev_code": code if not TWILIO_ACCOUNT_SID else None}
    else:
        raise HTTPException(status_code=500, detail="فشل إرسال رمز التحقق. حاول مرة أخرى.")


@router.post("/auth/verify-code")
def verify_code(req: VerifyCodeRequest):
    phone = normalize_phone(req.phone)
    if not phone:
        raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح")

    row = query_one(
        """
        SELECT * FROM verification_codes
        WHERE phone = %s AND code = %s AND used = FALSE AND expires_at > NOW()
        ORDER BY created_at DESC LIMIT 1
        """,
        [phone, req.code],
    )

    if not row:
        raise HTTPException(status_code=400, detail="رمز التحقق غير صحيح أو منتهي الصلاحية")

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("UPDATE verification_codes SET used = TRUE WHERE id = %s", (row["id"],))

        user = query_one("SELECT * FROM users WHERE phone = %s", [phone])

        if not user:
            if not req.first_name or not req.last_name:
                return {"status": "new_user", "token": None, "message": "أدخل اسمك الأول والأخير"}
            cur.execute(
                "INSERT INTO users (phone, first_name, last_name) VALUES (%s, %s, %s) RETURNING id",
                (phone, req.first_name, req.last_name),
            )
            user_id = cur.fetchone()[0]
        else:
            user_id = user["id"]
            if req.first_name and req.last_name:
                cur.execute(
                    "UPDATE users SET first_name = %s, last_name = %s WHERE id = %s",
                    (req.first_name, req.last_name, user_id),
                )

        cur.close()

    token = secrets.token_urlsafe(32)
    _sessions[token] = {"user_id": user_id, "phone": phone}

    user_data = query_one("SELECT id, phone, first_name, last_name FROM users WHERE id = %s", [user_id])
    return {"status": "ok", "token": token, "user": user_data}


@router.get("/auth/me")
def get_me(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="غير مصرح")
    token = authorization.replace("Bearer ", "")
    session = _sessions.get(token)
    if not session:
        raise HTTPException(status_code=401, detail="جلسة غير صالحة")
    user = query_one("SELECT id, phone, first_name, last_name FROM users WHERE id = %s", [session["user_id"]])
    if not user:
        raise HTTPException(status_code=401, detail="المستخدم غير موجود")
    return user
