import os
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

# Admin phone (bypasses login)
ADMIN_PHONE = "966514789632"


def create_session(token: str, user_id: int, phone: str):
    """Persist a session to the database so it survives server restarts."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO user_sessions (token, user_id, phone, expires_at)
               VALUES (%s, %s, %s, NOW() + INTERVAL '30 days')
               ON CONFLICT (token) DO UPDATE SET
                   user_id = EXCLUDED.user_id,
                   phone = EXCLUDED.phone,
                   expires_at = EXCLUDED.expires_at;""",
            (token, user_id, phone),
        )
        cur.close()


def get_session(token: str) -> dict | None:
    """Fetch a valid session from the database."""
    session = query_one(
        """SELECT token, user_id, phone FROM user_sessions
           WHERE token = %s AND expires_at > NOW();""",
        [token],
    )
    if session:
        return dict(session)
    return None


def delete_session(token: str):
    """Remove a session from the database."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM user_sessions WHERE token = %s;", [token])
        cur.close()


# Backward-compatible in-memory cache (kept for performance, DB is source of truth)
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
        # Add ip/country columns to existing search_logs table if missing
        try:
            cur.execute("ALTER TABLE search_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)")
            cur.execute("ALTER TABLE search_logs ADD COLUMN IF NOT EXISTS country VARCHAR(100)")
            cur.execute("ALTER TABLE search_logs ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE")
            cur.execute("ALTER TABLE search_logs ADD COLUMN IF NOT EXISTS source VARCHAR(100)")
        except Exception:
            pass
        # Traffic attribution columns on users (where the user came from)
        try:
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS source VARCHAR(100)")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS medium VARCHAR(100)")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS campaign VARCHAR(200)")
        except Exception:
            pass
        # Create persistent sessions table (survives server restarts)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                token VARCHAR(255) PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                phone VARCHAR(15) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days'
            );
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
        """)
        # Create subscriptions table for payments
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                plan VARCHAR(20) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                amount_paid INTEGER,
                payment_id VARCHAR(255),
                started_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP
            );
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
        """)
        # Create favorites table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS favorites (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                judgment_id INTEGER NOT NULL,
                favorited_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, judgment_id)
            );
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
        """)
        # Create legal studies table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS legal_studies (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                query TEXT NOT NULL,
                content TEXT NOT NULL,
                citations JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_legal_studies_user_id ON legal_studies(user_id);
        """)
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


class LoginRequest(BaseModel):
    phone: str
    first_name: str | None = None
    last_name: str | None = None
    source: str | None = None
    medium: str | None = None
    campaign: str | None = None


@router.post("/auth/login")
def simple_login(req: LoginRequest, request: Request):
    """Login or register a user with just phone + name. No OTP required."""
    phone = normalize_phone(req.phone)
    if not phone:
        raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح. يجب أن يبدأ بـ 05 ويتكون من 9 أرقام")

    ip = get_client_ip(request)
    country = get_country_from_ip(ip)

    user = query_one("SELECT * FROM users WHERE phone = %s", [phone])

    with get_db() as conn:
        cur = conn.cursor()
        if user:
            user_id = user["id"]
            if req.first_name and req.last_name:
                cur.execute("UPDATE users SET first_name = %s, last_name = %s WHERE id = %s",
                            (req.first_name, req.last_name, user_id))
        else:
            if not req.first_name or not req.last_name:
                raise HTTPException(status_code=400, detail="الاسم الأول والأخير مطلوبان للمستخدمين الجدد")
            cur.execute(
                "INSERT INTO users (phone, first_name, last_name, ip_address, country, source, medium, campaign) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (phone, req.first_name, req.last_name, ip, country, req.source, req.medium, req.campaign),
            )
            user_id = cur.fetchone()[0]
        cur.close()

    # Auto-join any firm that invited this phone before signup
    from api.routes.firms import accept_pending_invitations
    accept_pending_invitations(phone, user_id)

    token = secrets.token_urlsafe(32)
    create_session(token, user_id, phone)
    _sessions[token] = {"user_id": user_id, "phone": phone}

    user_data = query_one("SELECT id, phone, first_name, last_name FROM users WHERE id = %s", [user_id])
    return {"status": "ok", "token": token, "user": user_data}


@router.get("/auth/me")
def get_me(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="غير مصرح")
    token = authorization.replace("Bearer ", "")
    session = _sessions.get(token) or get_session(token)
    if not session:
        raise HTTPException(status_code=401, detail="جلسة غير صالحة")
    user = query_one("SELECT id, phone, first_name, last_name FROM users WHERE id = %s", [session["user_id"]])
    if not user:
        raise HTTPException(status_code=401, detail="المستخدم غير موجود")
    return user


class UpdateProfileRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None


@router.put("/auth/profile")
def update_profile(req: UpdateProfileRequest, authorization: str = Header(None)):
    """Update user profile (first name, last name)."""
    if not authorization:
        raise HTTPException(status_code=401, detail="غير مصرح")
    token = authorization.replace("Bearer ", "")
    session = _sessions.get(token) or get_session(token)
    if not session:
        raise HTTPException(status_code=401, detail="جلسة غير صالحة")
    user_id = session["user_id"]

    updates = []
    params = []
    if req.first_name is not None:
        updates.append("first_name = %s")
        params.append(req.first_name.strip())
    if req.last_name is not None:
        updates.append("last_name = %s")
        params.append(req.last_name.strip())
    if not updates:
        raise HTTPException(status_code=400, detail="لا توجد بيانات للتحديث")

    params.append(user_id)
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = %s", params)
        cur.close()

    user_data = query_one("SELECT id, phone, first_name, last_name FROM users WHERE id = %s", [user_id])
    return {"status": "ok", "user": user_data}


@router.get("/auth/payments")
def get_payment_history(authorization: str = Header(None)):
    """Get user's payment/subscription history."""
    if not authorization:
        raise HTTPException(status_code=401, detail="غير مصرح")
    token = authorization.replace("Bearer ", "")
    session = _sessions.get(token) or get_session(token)
    if not session:
        raise HTTPException(status_code=401, detail="جلسة غير صالحة")
    user_id = session["user_id"]

    rows = query_all(
        """SELECT id, plan, status, amount_paid, payment_id, started_at, expires_at
           FROM user_subscriptions WHERE user_id = %s ORDER BY started_at DESC""",
        [user_id],
    )
    return {"payments": [dict(r) for r in rows]}


@router.post("/auth/check-user")
def check_user(req: LoginRequest):
    phone = normalize_phone(req.phone)
    if not phone:
        raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح")
    user = query_one("SELECT id, phone, first_name, last_name FROM users WHERE phone = %s", [phone])
    return {"is_new": user is None, "user": user}


def log_search(phone: str, query: str, court_type: str = None, city: str = None, year: str = None, court_level: str = None, results_count: int = 0, ip_address: str = None, country: str = None, is_anonymous: bool = False, source: str = None):
    """Log a search query for analytics."""
    try:
        user = query_one("SELECT id FROM users WHERE phone = %s", [phone]) if phone and not is_anonymous else None
        user_id = user["id"] if user else None
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO search_logs (user_id, phone, query, court_type, city, year, court_level, results_count, ip_address, country, is_anonymous, source)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (user_id, phone or ("anonymous" if is_anonymous else None), query, court_type, city, year, court_level, results_count, ip_address, country, is_anonymous, source),
            )
            cur.close()
    except Exception as e:
        print(f"[LOG_SEARCH] Error: {e}")


class AdminSubscriptionRequest(BaseModel):
    plan: str  # 'monthly' | 'annual'


def _require_admin(authorization: str | None) -> None:
    if not authorization:
        raise HTTPException(status_code=401, detail="غير مصرح")
    token = authorization.replace("Bearer ", "")
    session = _sessions.get(token) or get_session(token)
    if not session or session["phone"] != ADMIN_PHONE:
        raise HTTPException(status_code=403, detail="غير مصرح")


@router.post("/auth/admin/users/{user_id}/subscription")
def admin_grant_subscription(user_id: int, req: AdminSubscriptionRequest, authorization: str = Header(None)):
    """Grant a user a subscription (one month or one year) from the admin dashboard.

    If the user already has an active subscription it is extended from its
    current expiry, so granting never shortens an existing subscription.
    """
    _require_admin(authorization)

    if req.plan not in ("monthly", "annual"):
        raise HTTPException(status_code=400, detail="نوع الاشتراك يجب أن يكون monthly أو annual")

    user = query_one("SELECT id FROM users WHERE id = %s;", [user_id])
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")

    from datetime import timedelta
    interval = timedelta(days=365 if req.plan == "annual" else 30)

    active = query_one(
        """SELECT id, expires_at FROM user_subscriptions
           WHERE user_id = %s AND status = 'active' AND expires_at > NOW()
           ORDER BY expires_at DESC LIMIT 1;""",
        [user_id],
    )

    with get_db() as conn:
        cur = conn.cursor()
        if active:
            cur.execute(
                "UPDATE user_subscriptions SET expires_at = expires_at + %s * INTERVAL '1 day' WHERE id = %s;",
                (interval.days, active["id"]),
            )
            action = "extended"
        else:
            cur.execute(
                """INSERT INTO user_subscriptions (user_id, plan, status, amount_paid, payment_id, started_at, expires_at)
                   VALUES (%s, %s, 'active', 0, 'ADMIN_GRANT', NOW(), NOW() + %s * INTERVAL '1 day');""",
                (user_id, req.plan, interval.days),
            )
            action = "granted"
        cur.close()

    sub = query_one(
        "SELECT plan, status, started_at, expires_at FROM user_subscriptions "
        "WHERE user_id = %s AND status = 'active' ORDER BY expires_at DESC LIMIT 1;",
        [user_id],
    )
    return {"status": "ok", "action": action, "subscription": dict(sub)}


@router.delete("/auth/admin/users/{user_id}/subscription")
def admin_revoke_subscription(user_id: int, authorization: str = Header(None)):
    """Cancel a user's active subscription."""
    _require_admin(authorization)

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE user_subscriptions SET status = 'cancelled' WHERE user_id = %s AND status = 'active';",
            [user_id],
        )
        cur.close()
    return {"status": "ok"}


@router.get("/auth/admin/stats")
def admin_stats(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="غير مصرح")
    token = authorization.replace("Bearer ", "")
    session = _sessions.get(token) or get_session(token)
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

    total_judgments = safe_query_one("SELECT COUNT(*) as cnt FROM judgments")["cnt"]
    total_cases = safe_query_one("SELECT COUNT(*) as cnt FROM cases")["cnt"]
    total_users = safe_query_one("SELECT COUNT(*) as cnt FROM users")["cnt"]
    total_searches = safe_query_one("SELECT COUNT(*) as cnt FROM search_logs")["cnt"]
    anonymous_searches = safe_query_one("SELECT COUNT(*) as cnt FROM search_logs WHERE is_anonymous = TRUE")["cnt"]

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
        """SELECT u.id, u.phone, u.first_name, u.last_name, u.ip_address, u.country, u.source, u.medium, u.campaign, u.created_at,
                  COUNT(sl.id) as search_count,
                  MAX(sl.created_at) as last_search,
                  us.plan as sub_plan,
                  us.status as sub_status,
                  us.amount_paid as sub_amount,
                  us.expires_at as sub_expires
           FROM users u
           LEFT JOIN search_logs sl ON sl.user_id = u.id
           LEFT JOIN LATERAL (
               SELECT * FROM user_subscriptions
               WHERE user_id = u.id AND status = 'active' AND expires_at > NOW()
               ORDER BY id DESC LIMIT 1
           ) us ON true
           GROUP BY u.id, u.phone, u.first_name, u.last_name, u.ip_address, u.country, u.source, u.medium, u.campaign, u.created_at,
                    us.plan, us.status, us.amount_paid, us.expires_at
           ORDER BY search_count DESC"""
    )

    traffic_sources = safe_query_all(
        """SELECT COALESCE(source, 'غير معروف') as source, COUNT(*) as cnt,
                  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as users_cnt
           FROM search_logs
           GROUP BY source
           ORDER BY cnt DESC LIMIT 20"""
    )

    recent_searches = safe_query_all(
        """SELECT sl.query, sl.phone, u.first_name, u.last_name, sl.created_at, sl.results_count, sl.ip_address, sl.country, sl.is_anonymous, sl.source
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

    paid_monthly = safe_query_one("SELECT COUNT(DISTINCT user_id) as cnt FROM user_subscriptions WHERE status = 'active' AND plan = 'monthly' AND amount_paid > 0 AND expires_at > NOW()")["cnt"]
    paid_annual = safe_query_one("SELECT COUNT(DISTINCT user_id) as cnt FROM user_subscriptions WHERE status = 'active' AND plan = 'annual' AND amount_paid > 0 AND expires_at > NOW()")["cnt"]
    free_trial = safe_query_one("SELECT COUNT(DISTINCT user_id) as cnt FROM user_subscriptions WHERE status = 'active' AND payment_id IN ('FREE_TRIAL','ADMIN_GRANT') AND expires_at > NOW()")["cnt"]

    # --- Feedback signals (relevance feedback system) ---
    feedback_signals_total = safe_query_one("SELECT COUNT(*) as cnt FROM search_feedback")["cnt"]
    feedback_clicks = safe_query_one("SELECT COUNT(*) as cnt FROM search_feedback WHERE signal_type = 'click'")["cnt"]
    feedback_relevant = safe_query_one("SELECT COUNT(*) as cnt FROM search_feedback WHERE signal_type = 'relevant'")["cnt"]
    feedback_not_relevant = safe_query_one("SELECT COUNT(*) as cnt FROM search_feedback WHERE signal_type = 'not_relevant'")["cnt"]
    top_feedback_queries = safe_query_all(
        """SELECT query, COUNT(*) as cnt,
                  SUM(CASE WHEN signal_type = 'relevant' THEN 1 ELSE 0 END) as relevant_cnt,
                  SUM(CASE WHEN signal_type = 'not_relevant' THEN 1 ELSE 0 END) as not_relevant_cnt
           FROM search_feedback WHERE query IS NOT NULL
           GROUP BY query ORDER BY cnt DESC LIMIT 10"""
    )
    recent_feedback_signals = safe_query_all(
        """SELECT sf.query, sf.signal_type, sf.position, sf.created_at,
                  j.judgment_number, u.first_name, u.last_name
           FROM search_feedback sf
           LEFT JOIN judgments j ON j.id = sf.judgment_id
           LEFT JOIN users u ON u.id = sf.user_id
           ORDER BY sf.created_at DESC LIMIT 30"""
    )

    # --- Firms (offices) and their members ---
    firms_stats = safe_query_all(
        """SELECT f.id, f.name, f.created_at,
                  u.first_name AS owner_first_name, u.last_name AS owner_last_name,
                  (SELECT COUNT(*) FROM firm_members fm WHERE fm.firm_id = f.id) AS members_count,
                  (SELECT COUNT(*) FROM user_cases uc WHERE uc.firm_id = f.id) AS cases_count,
                  (SELECT COUNT(*) FROM search_logs sl
                     JOIN firm_members fm2 ON fm2.user_id = sl.user_id
                    WHERE fm2.firm_id = f.id) AS searches_count
           FROM firms f
           LEFT JOIN users u ON u.id = f.owner_user_id
           ORDER BY f.created_at DESC LIMIT 50"""
    )
    firm_members_detail = safe_query_all(
        """SELECT fm.firm_id, fm.role, fm.created_at AS joined_at,
                  u.id AS user_id, u.first_name, u.last_name, u.phone,
                  (SELECT COUNT(*) FROM search_logs sl WHERE sl.user_id = u.id) AS searches_count,
                  (SELECT COUNT(*) FROM user_cases uc WHERE uc.user_id = u.id) AS cases_created
           FROM firm_members fm
           JOIN users u ON u.id = fm.user_id
           ORDER BY fm.created_at ASC LIMIT 200"""
    )

    # --- Feature usage (most used features, total and last 7 days) ---
    def _feature(table, extra_where="", timestamp_col="created_at"):
        total = safe_query_one(f"SELECT COUNT(*) as cnt FROM {table} {extra_where}")["cnt"]
        weekly = safe_query_one(
            f"SELECT COUNT(*) as cnt FROM {table} WHERE {timestamp_col} >= NOW() - INTERVAL '7 days' {extra_where.replace('WHERE', 'AND')}"
        )["cnt"]
        return {"total": total, "week": weekly}

    feature_usage = [
        {"key": "search", "label": "البحث في الأحكام", **_feature("search_logs")},
        {"key": "cases", "label": "إنشاء القضايا", **_feature("user_cases")},
        {"key": "hearings", "label": "تسجيل الجلسات", **_feature("case_hearings")},
        {"key": "linked_judgments", "label": "ربط الأحكام بالقضايا", **_feature("case_judgments")},
        {"key": "assistant", "label": "المساعد الذكي", **_feature("case_messages", "WHERE role = 'user'")},
        {"key": "documents", "label": "رفع المستندات", **_feature("case_documents")},
        {"key": "drafts", "label": "صياغة المستندات", **_feature("case_drafts")},
        {"key": "studies", "label": "الدراسات القانونية", **_feature("legal_studies")},
        {"key": "favorites", "label": "المفضلة", **_feature("favorites", "", "favorited_at")},
        {"key": "firms", "label": "إنشاء المكاتب", **_feature("firms")},
    ]

    # --- Moyasar payment outcomes (paid vs failed, with reasons) ---
    try:
        from api.routes.payments import get_moyasar_overview
        payment_outcomes = get_moyasar_overview()
    except Exception as e:
        print(f"[ADMIN_STATS] Moyasar overview failed: {e}")
        payment_outcomes = {"available": False}

    if payment_outcomes.get("available"):
        failed_ids = {
            int(f["user_id"]) for f in payment_outcomes.get("failed", [])
            if f.get("user_id") and str(f["user_id"]).isdigit()
        }
        failed_users = {}
        if failed_ids:
            rows = query_all(
                "SELECT id, phone, first_name, last_name FROM users WHERE id = ANY(%s::int[])",
                [list(failed_ids)],
            )
            for r in rows:
                name = " ".join(x for x in [r["first_name"], r["last_name"]] if x)
                failed_users[r["id"]] = name or r["phone"]
        for f in payment_outcomes.get("failed", []):
            uid = f.get("user_id")
            try:
                f["user_label"] = failed_users.get(int(uid), f"مستخدم #{uid}") if uid else None
            except (TypeError, ValueError):
                f["user_label"] = f"مستخدم #{uid}" if uid else None

    return {
        "total_judgments": total_judgments,
        "total_cases": total_cases,
        "total_users": total_users,
        "total_searches": total_searches,
        "anonymous_searches": anonymous_searches,
        "paid_monthly": paid_monthly,
        "paid_annual": paid_annual,
        "free_trial": free_trial,
        "payment_outcomes": payment_outcomes,
        "top_keywords": top_keywords,
        "top_court_types": top_court_types,
        "traffic_sources": traffic_sources,
        "users": users_with_searches,
        "recent_searches": recent_searches,
        "searches_by_day": searches_by_day,
        "recent_cases": recent_cases,
        "feedback_signals_total": feedback_signals_total,
        "feedback_clicks": feedback_clicks,
        "feedback_relevant": feedback_relevant,
        "feedback_not_relevant": feedback_not_relevant,
        "top_feedback_queries": top_feedback_queries,
        "recent_feedback_signals": recent_feedback_signals,
        "firms": firms_stats,
        "firm_members": firm_members_detail,
        "feature_usage": feature_usage,
    }


@router.post("/auth/admin-login")
def admin_login(req: LoginRequest, request: Request):
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
    create_session(token, user_id, phone)
    _sessions[token] = {"user_id": user_id, "phone": phone}

    user_data = query_one("SELECT id, phone, first_name, last_name FROM users WHERE id = %s", [user_id])
    return {"status": "ok", "token": token, "user": user_data}


# --- Authentica OTP Integration ---

AUTHENTICA_API_URL = "https://api.authentica.sa/api/v2"


def _get_authentica_key() -> str:
    return os.getenv("AUTHENTICA_API_KEY", "")


def _authentica_request(endpoint: str, data: dict) -> dict:
    """Make an authenticated request to Authentica API."""
    api_key = _get_authentica_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="Authentica API key not configured")
    url = f"{AUTHENTICA_API_URL}{endpoint}"
    body = _json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-Authorization": api_key,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return _json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"[AUTHENTICA] Error {e.code}: {error_body}")
        raise HTTPException(status_code=e.code, detail=f"Authentica error: {error_body}")
    except Exception as e:
        print(f"[AUTHENTICA] Request failed: {e}")
        raise HTTPException(status_code=500, detail="فشل الاتصال بخدمة التحقق")


class SendOtpRequest(BaseModel):
    phone: str


class VerifyOtpRequest(BaseModel):
    phone: str
    code: str
    first_name: str | None = None
    last_name: str | None = None
    source: str | None = None
    medium: str | None = None
    campaign: str | None = None


@router.post("/auth/send-otp")
def send_otp(req: SendOtpRequest):
    """Send OTP via Authentica SMS."""
    phone = normalize_phone(req.phone)
    if not phone:
        raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح. يجب أن يبدأ بـ 05 ويتكون من 9 أرقام")

    # Admin bypass - no OTP needed
    if phone == ADMIN_PHONE:
        return {"status": "ok", "message": "تم إرسال رمز التحقق"}

    international_phone = "+" + phone
    result = _authentica_request("/send-otp", {
        "method": "sms",
        "phone": international_phone,
        "template": "استخدم الرمز {{otp}} للتحقق من حسابك في {{app_name}}.",
        "app_name": "الباحث",
    })
    return {"status": "ok", "message": "تم إرسال رمز التحقق"}


@router.post("/auth/verify-otp")
def verify_otp(req: VerifyOtpRequest, request: Request):
    """Verify OTP via Authentica and login/register user."""
    phone = normalize_phone(req.phone)
    if not phone:
        raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح")

    if len(req.code) != 4 or not req.code.isdigit():
        raise HTTPException(status_code=400, detail="الرمز يجب أن يتكون من 4 أرقام")

    # Admin bypass - skip Authentica verification
    if phone != ADMIN_PHONE:
        international_phone = "+" + phone
        result = _authentica_request("/verify-otp", {
            "phone": international_phone,
            "otp": req.code,
        })

        if not result.get("status") and not result.get("verified"):
            raise HTTPException(status_code=400, detail="رمز التحقق غير صحيح")

    ip = get_client_ip(request)
    country = get_country_from_ip(ip)

    user = query_one("SELECT * FROM users WHERE phone = %s", [phone])

    with get_db() as conn:
        cur = conn.cursor()
        if user:
            user_id = user["id"]
            if req.first_name and req.last_name:
                cur.execute("UPDATE users SET first_name = %s, last_name = %s WHERE id = %s",
                            (req.first_name, req.last_name, user_id))
        else:
            if not req.first_name or not req.last_name:
                raise HTTPException(status_code=400, detail="الاسم الأول والأخير مطلوبان للمستخدمين الجدد")
            cur.execute(
                "INSERT INTO users (phone, first_name, last_name, ip_address, country, source, medium, campaign) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (phone, req.first_name, req.last_name, ip, country, req.source, req.medium, req.campaign),
            )
            user_id = cur.fetchone()[0]
        cur.close()

    # Auto-join any firm that invited this phone before signup
    from api.routes.firms import accept_pending_invitations
    accept_pending_invitations(phone, user_id)

    token = secrets.token_urlsafe(32)
    create_session(token, user_id, phone)
    _sessions[token] = {"user_id": user_id, "phone": phone}

    user_data = query_one("SELECT id, phone, first_name, last_name FROM users WHERE id = %s", [user_id])
    return {"status": "ok", "token": token, "user": user_data}
