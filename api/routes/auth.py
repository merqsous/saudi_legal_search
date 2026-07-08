import os
import random
import time
import secrets
import urllib.parse
import urllib.request
import json as _json
from fastapi import APIRouter, Query, HTTPException, Header, Request
from pydantic import BaseModel
from api.db import query_one, query_all, get_db
from api.config import OPENAI_API_KEY

router = APIRouter()

# Twilio config (kept as fallback)
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_API_KEY_SID = os.getenv("TWILIO_API_KEY_SID", "")
TWILIO_API_KEY_SECRET = os.getenv("TWILIO_API_KEY_SECRET", "")
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "")

# WAHA (WhatsApp HTTP API) config
WAHA_URL = os.getenv("WAHA_URL", "http://localhost:3001")

# Admin phone (bypasses OTP)
ADMIN_PHONE = "966514789632"

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
                ip_address VARCHAR(45),
                country VARCHAR(100),
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
        cur.execute("""
            CREATE TABLE IF NOT EXISTS search_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                phone VARCHAR(15),
                query TEXT NOT NULL,
                court_type VARCHAR(50),
                city VARCHAR(100),
                year VARCHAR(10),
                court_level VARCHAR(50),
                results_count INTEGER DEFAULT 0,
                ip_address VARCHAR(45),
                country VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        # Add ip/country columns to existing users table if missing
        try:
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100)")
        except Exception:
            pass
        cur.close()


def normalize_phone(phone: str) -> str:
    """Normalize Saudi phone to format 9665XXXXXXXX."""
    phone = phone.strip().replace("-", "").replace(" ", "").replace("+", "")
    if phone.startswith("00966"):
        phone = phone[5:]
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


def get_client_ip(request: Request) -> str:
    """Extract client IP from request headers."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP", "")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"


def get_country_from_ip(ip: str) -> str:
    """Get country name from IP using free ip-api.com."""
    if not ip or ip == "unknown" or ip.startswith("127.") or ip.startswith("10."):
        return "Local"
    try:
        url = f"http://ip-api.com/json/{ip}?fields=country"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = _json.loads(resp.read().decode())
            return data.get("country", "Unknown")
    except Exception:
        return "Unknown"


def send_otp(phone: str, code: str) -> bool:
    """Send OTP via WAHA WhatsApp API. Falls back to console log if WAHA is not running."""
    if not WAHA_URL:
        print(f"[DEV MODE] OTP for {phone}: {code}")
        return True

    try:
        import urllib.request
        import json as _json

        url = f"{WAHA_URL}/send"
        data = _json.dumps({
            "phone": f"+{phone}",
            "message": f"رمز التحقق الخاص بك في الباحث القانوني هو: {code}",
        }).encode()

        req = urllib.request.Request(url, data=data, method="POST")
        req.add_header("Content-Type", "application/json")

        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception as e:
        print(f"WAHA send error: {e}")
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

    sent = send_otp(phone, code)

    if sent:
        return {"status": "ok", "message": "تم إرسال رمز التحقق عبر واتساب", "dev_code": code if not WAHA_URL else None}
    else:
        raise HTTPException(status_code=500, detail="فشل إرسال رمز التحقق. حاول مرة أخرى.")


@router.post("/auth/verify-code")
def verify_code(req: VerifyCodeRequest, request: Request):
    phone = normalize_phone(req.phone)
    if not phone:
        raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح")

    print(f"[VERIFY] phone={phone}, code={req.code}")

    row = query_one(
        """
        SELECT * FROM verification_codes
        WHERE phone = %s AND code = %s AND used = FALSE AND expires_at > NOW()
        ORDER BY created_at DESC LIMIT 1
        """,
        [phone, req.code],
    )

    if not row:
        all_codes = query_all(
            "SELECT id, phone, code, used, expires_at, created_at FROM verification_codes WHERE phone = %s ORDER BY created_at DESC LIMIT 5",
            [phone],
        )
        print(f"[VERIFY] No match. Recent codes for {phone}: {all_codes}")
        raise HTTPException(status_code=400, detail="رمز التحقق غير صحيح أو منتهي الصلاحية")

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("UPDATE verification_codes SET used = TRUE WHERE id = %s", (row["id"],))

        user = query_one("SELECT * FROM users WHERE phone = %s", [phone])

        if not user:
            if not req.first_name or not req.last_name:
                return {"status": "new_user", "token": None, "message": "أدخل اسمك الأول والأخير"}
            ip = get_client_ip(request)
            country = get_country_from_ip(ip)
            cur.execute(
                "INSERT INTO users (phone, first_name, last_name, ip_address, country) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (phone, req.first_name, req.last_name, ip, country),
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


@router.post("/auth/check-user")
def check_user(req: SendCodeRequest):
    phone = normalize_phone(req.phone)
    if not phone:
        raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح")
    user = query_one("SELECT id, phone, first_name, last_name FROM users WHERE phone = %s", [phone])
    return {"is_new": user is None, "user": user}


def log_search(phone: str, query: str, court_type: str = None, city: str = None, year: str = None, court_level: str = None, results_count: int = 0, ip_address: str = None, country: str = None):
    """Log a search query for analytics."""
    try:
        user = query_one("SELECT id FROM users WHERE phone = %s", [phone])
        user_id = user["id"] if user else None
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO search_logs (user_id, phone, query, court_type, city, year, court_level, results_count, ip_address, country)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (user_id, phone, query, court_type, city, year, court_level, results_count, ip_address, country),
            )
            cur.close()
    except Exception as e:
        print(f"[LOG_SEARCH] Error: {e}")


@router.get("/auth/admin/stats")
def admin_stats(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="غير مصرح")
    token = authorization.replace("Bearer ", "")
    session = _sessions.get(token)
    if not session or session["phone"] != ADMIN_PHONE:
        raise HTTPException(status_code=403, detail="غير مصرح")

    def safe_query_one(sql, params=None):
        try:
            return query_one(sql, params or [])
        except Exception as e:
            print(f"[ADMIN_STATS] query_one error: {e}")
            return {"cnt": 0}

    def safe_query_all(sql, params=None):
        try:
            return query_all(sql, params or [])
        except Exception as e:
            print(f"[ADMIN_STATS] query_all error: {e}")
            return []

    total_cases = safe_query_one("SELECT COUNT(*) as cnt FROM judgments")["cnt"]
    total_users = safe_query_one("SELECT COUNT(*) as cnt FROM users")["cnt"]
    total_searches = safe_query_one("SELECT COUNT(*) as cnt FROM search_logs")["cnt"]

    top_keywords = safe_query_all(
        """SELECT query, COUNT(*) as cnt FROM search_logs
           GROUP BY query ORDER BY cnt DESC LIMIT 20"""
    )

    top_court_types = safe_query_all(
        """SELECT sl.court_type, ct.name_ar, COUNT(*) as cnt
           FROM search_logs sl
           LEFT JOIN court_types ct ON ct.code = sl.court_type
           WHERE sl.court_type IS NOT NULL
           GROUP BY sl.court_type, ct.name_ar
           ORDER BY cnt DESC LIMIT 10"""
    )

    users_with_searches = safe_query_all(
        """SELECT u.id, u.phone, u.first_name, u.last_name, u.ip_address, u.country, u.created_at,
                  COUNT(sl.id) as search_count,
                  MAX(sl.created_at) as last_search
           FROM users u
           LEFT JOIN search_logs sl ON sl.user_id = u.id
           GROUP BY u.id, u.phone, u.first_name, u.last_name, u.ip_address, u.country, u.created_at
           ORDER BY search_count DESC"""
    )

    recent_searches = safe_query_all(
        """SELECT sl.query, sl.phone, u.first_name, u.last_name, sl.created_at, sl.results_count, sl.ip_address, sl.country
           FROM search_logs sl
           LEFT JOIN users u ON u.id = sl.user_id
           ORDER BY sl.created_at DESC LIMIT 50"""
    )

    searches_by_day = safe_query_all(
        """SELECT DATE(created_at) as day, COUNT(*) as cnt
           FROM search_logs
           WHERE created_at > NOW() - INTERVAL '30 days'
           GROUP BY DATE(created_at) ORDER BY day"""
    )

    recent_cases = safe_query_all(
        """SELECT j.id, j.judgment_number, j.judgment_year, j.judgment_type,
                  j.details_url, c.case_number, c.case_year,
                  ct.name_ar AS court_type, l.city_ar AS city
           FROM judgments j
           LEFT JOIN cases c ON j.case_id = c.id
           LEFT JOIN court_types ct ON c.court_type_id = ct.id
           LEFT JOIN locations l ON c.location_id = l.id
           ORDER BY j.id DESC LIMIT 20"""
    )

    return {
        "total_cases": total_cases,
        "total_users": total_users,
        "total_searches": total_searches,
        "top_keywords": top_keywords,
        "top_court_types": top_court_types,
        "users": users_with_searches,
        "recent_searches": recent_searches,
        "searches_by_day": searches_by_day,
        "recent_cases": recent_cases,
    }


@router.post("/auth/admin-login")
def admin_login(req: SendCodeRequest, request: Request):
    phone = normalize_phone(req.phone)
    if not phone:
        raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح")

    if phone != ADMIN_PHONE:
        raise HTTPException(status_code=403, detail="غير مصرح")

    ip = get_client_ip(request)
    country = get_country_from_ip(ip)

    with get_db() as conn:
        cur = conn.cursor()
        user = query_one("SELECT * FROM users WHERE phone = %s", [phone])
        if not user:
            cur.execute(
                "INSERT INTO users (phone, first_name, last_name, ip_address, country) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (phone, "Admin", "User", ip, country),
            )
            user_id = cur.fetchone()[0]
        else:
            user_id = user["id"]
            cur.execute(
                "UPDATE users SET ip_address = %s, country = %s WHERE id = %s",
                (ip, country, user_id),
            )
        cur.close()

    token = secrets.token_urlsafe(32)
    _sessions[token] = {"user_id": user_id, "phone": phone}

    user_data = query_one("SELECT id, phone, first_name, last_name FROM users WHERE id = %s", [user_id])
    return {"status": "ok", "token": token, "user": user_data}
