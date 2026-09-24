import os
import json
import base64
import urllib.request
import urllib.error
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from api.db import query_one, get_db
from api.routes.auth import get_session

router = APIRouter()

BASE_URL = "https://api.moyasar.com/v1"

# Canonical subscription prices in halalas (1 SAR = 100 halalas).
# The client sends a plan name only; the amount actually charged via Moyasar
# is always taken from here, never trusted from the request body.
PLAN_PRICES = {
    "monthly": 1200,   # 12 SAR
    "annual": 10000,   # 100 SAR
}


def _get_secret_key() -> str:
    return os.getenv("MOYASAR_SECRET_KEY", "")


class CreatePaymentRequest(BaseModel):
    amount: int  # in halalas; advisory only, server overrides with PLAN_PRICES[plan]
    currency: str = "SAR"
    description: str
    plan: str  # "monthly" or "annual"
    source: dict = {"type": "creditcard"}


class ApplePaySessionRequest(BaseModel):
    validation_url: str
    display_name: str = "Albaheth"
    domain_name: str = ""


class WebhookPayload(BaseModel):
    id: str
    status: str
    amount: int
    currency: str
    source: dict = {}
    metadata: dict = {}


def _get_user_from_auth(authorization: str | None) -> int | None:
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "")
    session = get_session(token)
    return session["user_id"] if session else None


def _moyasar_request(endpoint: str, data: dict, method: str = "POST") -> dict:
    """Make an authenticated request to Moyasar API."""
    secret_key = _get_secret_key()
    url = f"{BASE_URL}{endpoint}"
    body = json.dumps(data).encode("utf-8")
    auth = base64.b64encode(f"{secret_key}:".encode("utf-8")).decode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method=method,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Basic {auth}",
            "User-Agent": "Albaheth/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        raise HTTPException(status_code=e.code, detail=f"Moyasar error: {error_body}")


@router.post("/payments/create")
def create_payment(req: CreatePaymentRequest, authorization: str = Header(None)):
    """Create a Moyasar payment session."""
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")

    if req.plan not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail="باقة غير صالحة")

    # Never trust the client-supplied amount; always charge the canonical price.
    amount = PLAN_PRICES[req.plan]

    secret_key = _get_secret_key()
    if not secret_key:
        raise HTTPException(status_code=500, detail="Payment system not configured")

    # Moyasar callback URLs
    callback_url = os.getenv("MOYASAR_CALLBACK_URL", "http://localhost:3000/pricing?payment=callback")

    result = _moyasar_request("/payments", {
        "amount": amount,
        "currency": req.currency,
        "description": req.description,
        "callback_url": callback_url,
        "source": req.source,
        "metadata": {
            "user_id": str(user_id),
            "plan": req.plan,
        },
    })

    return result


@router.post("/payments/applepay/session")
def initiate_applepay_session(req: ApplePaySessionRequest, authorization: str = Header(None)):
    """Initiate Apple Pay session via Moyasar."""
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")

    publishable_key = os.getenv("MOYASAR_PUBLIC_KEY", "")
    if not publishable_key:
        raise HTTPException(status_code=500, detail="Payment system not configured")

    url = f"{BASE_URL}/applepay/initiate"
    body = json.dumps({
        "validation_url": req.validation_url,
        "display_name": req.display_name,
        "domain_name": req.domain_name,
        "publishable_api_key": publishable_key,
    }).encode("utf-8")
    req_obj = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Albaheth/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req_obj) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        raise HTTPException(status_code=e.code, detail=f"Apple Pay error: {error_body}")


@router.get("/payments")
def list_payments(authorization: str = Header(None), page: int = 1):
    """List all Moyasar payments for the authenticated user."""
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")

    secret_key = _get_secret_key()
    if not secret_key:
        raise HTTPException(status_code=500, detail="Payment system not configured")

    url = f"{BASE_URL}/payments?page={page}"
    auth = base64.b64encode(f"{secret_key}:".encode("utf-8")).decode("utf-8")
    req = urllib.request.Request(
        url,
        method="GET",
        headers={"Authorization": f"Basic {auth}", "User-Agent": "Albaheth/1.0", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=e.code, detail="Failed to fetch payments")

    # Filter payments by user_id in metadata
    all_payments = result.get("payments", [])
    user_payments = [p for p in all_payments if p.get("metadata", {}).get("user_id") == str(user_id)]
    result["payments"] = user_payments
    return result


@router.get("/payments/{payment_id}")
def get_payment_status(payment_id: str, authorization: str = Header(None)):
    """Check the status of a Moyasar payment."""
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")

    secret_key = _get_secret_key()
    if not secret_key:
        raise HTTPException(status_code=500, detail="Payment system not configured")

    url = f"{BASE_URL}/payments/{payment_id}"
    auth = base64.b64encode(f"{secret_key}:".encode("utf-8")).decode("utf-8")
    req = urllib.request.Request(
        url,
        method="GET",
        headers={"Authorization": f"Basic {auth}", "User-Agent": "Albaheth/1.0"},
    )
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=e.code, detail="Failed to fetch payment")

    # If payment is paid, update user subscription in DB
    if result.get("status") == "paid":
        metadata = result.get("metadata", {})
        plan = metadata.get("plan", "monthly")
        amount = result.get("amount", 0)
        _activate_subscription(user_id, plan, amount, payment_id)

    return result


@router.post("/payments/webhook")
def moyasar_webhook(payload: WebhookPayload):
    """Webhook endpoint for Moyasar payment notifications."""
    if payload.status == "paid":
        metadata = payload.metadata or {}
        user_id = metadata.get("user_id")
        plan = metadata.get("plan", "monthly")
        if user_id:
            _activate_subscription(int(user_id), plan, payload.amount, payload.id)
    return {"status": "ok"}


@router.get("/subscriptions/status")
def get_subscription_status(authorization: str = Header(None)):
    """Check if user has an active subscription."""
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")

    sub = query_one(
        "SELECT plan, status, started_at, expires_at FROM user_subscriptions "
        "WHERE user_id = %s AND status = 'active' AND expires_at > NOW() "
        "ORDER BY started_at DESC LIMIT 1;",
        [user_id],
    )
    if not sub:
        return {"subscribed": False, "plan": None, "expires_at": None}

    return {
        "subscribed": True,
        "plan": sub["plan"],
        "started_at": sub["started_at"],
        "expires_at": sub["expires_at"],
    }


def get_moyasar_overview(max_pages: int = 20) -> dict:
    """Fetch all payments from Moyasar and build a status overview
    (paid vs failed, with failure reasons) for the admin dashboard."""
    secret_key = _get_secret_key()
    if not secret_key:
        return {"available": False}

    auth = base64.b64encode(f"{secret_key}:".encode("utf-8")).decode("utf-8")
    payments = []
    for page in range(1, max_pages + 1):
        req = urllib.request.Request(
            f"{BASE_URL}/payments?page={page}",
            headers={"Authorization": f"Basic {auth}", "Accept": "application/json", "User-Agent": "Albaheth/1.0"},
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                result = json.loads(response.read().decode("utf-8"))
        except Exception:
            break
        batch = result.get("payments", [])
        if not batch:
            break
        payments.extend(batch)
        if page >= (result.get("meta", {}).get("total_pages") or 1):
            break

    status_counts: dict = {}
    for p in payments:
        status = p.get("status") or "unknown"
        status_counts[status] = status_counts.get(status, 0) + 1

    failed = []
    for p in payments:
        if p.get("status") == "paid":
            continue
        src = p.get("source", {}) or {}
        meta = p.get("metadata", {}) or {}
        failed.append({
            "payment_id": p.get("id"),
            "status": p.get("status"),
            "amount": (p.get("amount") or 0) // 100,
            "user_id": meta.get("user_id"),
            "reason": src.get("message") or "",
            "created_at": p.get("created_at"),
        })
    failed.sort(key=lambda f: f.get("created_at") or "", reverse=True)

    return {"available": True, "total": len(payments), "status_counts": status_counts, "failed": failed}


def _activate_subscription(user_id: int, plan: str, amount: int, payment_id: str):
    """Activate a user subscription after successful payment."""
    from datetime import datetime, timedelta

    if plan == "annual":
        expires = datetime.now() + timedelta(days=365)
    else:
        expires = datetime.now() + timedelta(days=30)

    with get_db() as conn:
        cur = conn.cursor()
        # Deactivate old subscriptions
        cur.execute("UPDATE user_subscriptions SET status = 'cancelled' WHERE user_id = %s AND status = 'active';", [user_id])
        # Create new subscription
        cur.execute(
            """INSERT INTO user_subscriptions (user_id, plan, status, amount_paid, payment_id, started_at, expires_at)
               VALUES (%s, %s, 'active', %s, %s, NOW(), %s);""",
            (user_id, plan, amount, payment_id, expires),
        )
        cur.close()
