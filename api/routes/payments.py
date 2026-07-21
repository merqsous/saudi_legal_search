import os
import json
import urllib.request
import urllib.error
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from api.db import query_one, get_db
from api.routes.auth import get_session

router = APIRouter()

BASE_URL = "https://api.moyasar.com/v1"


def _get_secret_key() -> str:
    return os.getenv("MOYASAR_SECRET_KEY", "")


class CreatePaymentRequest(BaseModel):
    amount: int  # in halalas (1 SAR = 100 halalas)
    currency: str = "SAR"
    description: str
    plan: str  # "monthly" or "annual"


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
    req = urllib.request.Request(
        url,
        data=body,
        method=method,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Basic {secret_key}",
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

    secret_key = _get_secret_key()
    if not secret_key:
        raise HTTPException(status_code=500, detail="Payment system not configured")

    # Moyasar callback URLs
    callback_url = os.getenv("MOYASAR_CALLBACK_URL", "https://albaheth.app/pricing?payment=callback")

    result = _moyasar_request("/payments", {
        "amount": req.amount,
        "currency": req.currency,
        "description": req.description,
        "callback_url": callback_url,
        "source": {"type": "creditcard"},
        "metadata": {
            "user_id": str(user_id),
            "plan": req.plan,
        },
    })

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
    req = urllib.request.Request(
        url,
        method="GET",
        headers={"Authorization": f"Basic {secret_key}"},
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
        "SELECT plan, status, started_at, expires_at FROM user_subscriptions WHERE user_id = %s AND status = 'active' ORDER BY started_at DESC LIMIT 1;",
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
