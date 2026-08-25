import os
import secrets
import base64
import hashlib
import hmac
import uuid
from pathlib import Path
from urllib.parse import quote, urlencode

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

app = FastAPI(title="30D Embedded API")
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", ""),
    https_only=os.getenv("APP_ENV") == "production",
    same_site="lax",
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
PRODUCT_PRICE_INR = 49


def safe_app_path(candidate: str | None, fallback: str = "/") -> str:
    """Accept only same-site application paths for post-auth redirects."""
    if candidate and candidate.startswith("/") and not candidate.startswith("//") and "\\" not in candidate:
        return candidate
    return fallback


def required(*names: str) -> None:
    missing = [name for name in names if not os.getenv(name)]
    if missing:
        detail = "Secure checkout is not configured yet. Add the required server environment variables."
        if os.getenv("APP_ENV") != "production":
            detail = f"Missing server configuration: {', '.join(missing)}"
        raise HTTPException(
            status_code=503,
            detail=detail,
        )


def supabase_headers() -> dict[str, str]:
    service_role_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
    }


async def sync_supabase_profile(google_user: dict[str, object]) -> dict[str, str]:
    """Create/reuse the server-owned Supabase identity, then upsert its profile."""
    required("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")
    base_url = os.environ["SUPABASE_URL"].rstrip("/")
    email = str(google_user["email"])
    full_name = str(google_user.get("name") or "Customer")
    avatar_url = str(google_user.get("picture") or "")
    headers = supabase_headers()

    async with httpx.AsyncClient(timeout=15) as client:
        # A profile lookup makes repeated Google sign-ins idempotent and avoids
        # creating a second Supabase account for the same verified email.
        existing = await client.get(
            f"{base_url}/rest/v1/profiles?select=id&email=eq.{quote(email, safe='')}",
            headers=headers,
        )
        if existing.status_code >= 400:
            raise HTTPException(status_code=503, detail="Account setup is temporarily unavailable. Please try again.")
        rows = existing.json()
        profile_id = str(rows[0]["id"]) if rows else ""

        if not profile_id:
            created = await client.post(
                f"{base_url}/auth/v1/admin/users",
                headers=headers,
                json={
                    "email": email,
                    "email_confirm": True,
                    "user_metadata": {"full_name": full_name, "avatar_url": avatar_url},
                },
            )
            if created.status_code >= 400:
                raise HTTPException(status_code=503, detail="Account setup is temporarily unavailable. Please try again.")
            profile_id = str(created.json()["id"])

        upsert = await client.post(
            f"{base_url}/rest/v1/profiles?on_conflict=id",
            headers={**headers, "Prefer": "resolution=merge-duplicates,return=minimal"},
            json={
                "id": profile_id,
                "full_name": full_name,
                "email": email,
                "avatar_url": avatar_url or None,
            },
        )
        if upsert.status_code >= 400:
            raise HTTPException(status_code=503, detail="Account setup is temporarily unavailable. Please try again.")

    return {"id": profile_id, "email": email, "name": full_name}


@app.get("/api/health")
async def health() -> dict[str, bool]:
    return {"ok": True}


@app.get("/api/auth/me")
async def current_user(request: Request) -> dict[str, object]:
    user = request.session.get("user")
    return {"authenticated": bool(user), "user": user}


@app.post("/api/auth/sign-out")
async def sign_out(request: Request) -> dict[str, bool]:
    request.session.clear()
    return {"ok": True}


@app.get("/api/auth/google/start")
async def google_sign_in(request: Request, next: str = "/") -> RedirectResponse:
    required("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "SESSION_SECRET")
    state = secrets.token_urlsafe(32)
    request.session["oauth_state"] = state
    request.session["oauth_next"] = safe_app_path(next)
    redirect_uri = f"{FRONTEND_URL}/api/auth/google/callback"
    query = urlencode({
        "client_id": os.environ["GOOGLE_CLIENT_ID"],
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    })
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{query}")


@app.get("/api/auth/google/callback")
async def google_callback(request: Request, code: str, state: str) -> RedirectResponse:
    if not secrets.compare_digest(state, request.session.pop("oauth_state", "")):
        raise HTTPException(status_code=400, detail="Invalid sign-in state.")
    redirect_uri = f"{FRONTEND_URL}/api/auth/google/callback"
    async with httpx.AsyncClient(timeout=15) as client:
        token_response = await client.post("https://oauth2.googleapis.com/token", data={
            "code": code,
            "client_id": os.environ["GOOGLE_CLIENT_ID"],
            "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        })
        token_response.raise_for_status()
        user_response = await client.get(
            "https://openidconnect.googleapis.com/v1/userinfo",
            headers={"Authorization": f"Bearer {token_response.json()['access_token']}"},
        )
        user_response.raise_for_status()
    user = user_response.json()
    if not user.get("email_verified"):
        raise HTTPException(status_code=400, detail="A verified Google email is required.")
    supabase_user = await sync_supabase_profile(user)
    request.session["user"] = supabase_user
    destination = safe_app_path(request.session.pop("oauth_next", "/"))
    # Google sign-in always lands at the top of the website unless an internal
    # protected route explicitly requested the sign-in flow.
    if destination in {"/", "/philosophy", "/path", "/preview"}:
        destination = "/"
    separator = "&" if "?" in destination else "?"
    return RedirectResponse(f"{FRONTEND_URL}{destination}{separator}signed_in=1", status_code=303)


def cashfree_base_url() -> str:
    return "https://sandbox.cashfree.com/pg" if os.getenv("CASHFREE_ENV", "SANDBOX").upper() == "SANDBOX" else "https://api.cashfree.com/pg"


@app.post("/api/payments/checkout")
async def checkout(request: Request) -> dict[str, str]:
    if not request.session.get("user"):
        raise HTTPException(status_code=401, detail="Please sign in before checkout.")
    required("CASHFREE_CLIENT_ID", "CASHFREE_CLIENT_SECRET")
    body = await request.json()
    phone = str(body.get("phone", "")).strip()
    if not phone or len(phone) < 10 or len(phone) > 15 or not phone.replace("+", "", 1).isdigit():
        raise HTTPException(status_code=422, detail="Please provide a valid phone number for checkout.")
    user = request.session["user"]
    merchant_order_id = f"ef_{uuid.uuid4().hex[:24]}"
    payload = {
        "order_id": merchant_order_id,
        "order_amount": PRODUCT_PRICE_INR,
        "order_currency": "INR",
        "order_note": "EmbedForge 30-Day Microcontroller Learning Kit",
        "customer_details": {
            "customer_id": f"google_{user['id']}",
            "customer_email": user["email"],
            "customer_phone": phone,
        },
        "order_meta": {"return_url": f"{FRONTEND_URL}/payment/return?order_id={merchant_order_id}"},
    }
    headers = {
        "x-client-id": os.environ["CASHFREE_CLIENT_ID"],
        "x-client-secret": os.environ["CASHFREE_CLIENT_SECRET"],
        "x-api-version": os.getenv("CASHFREE_API_VERSION", "2025-01-01"),
        "x-idempotency-key": str(uuid.uuid4()),
    }
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(f"{cashfree_base_url()}/orders", json=payload, headers=headers)
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Checkout is temporarily unavailable. Please try again shortly.")
    data = response.json()
    session_id = data.get("payment_session_id")
    if not session_id:
        raise HTTPException(status_code=502, detail="Checkout is temporarily unavailable. Please try again shortly.")
    pending_orders = request.session.get("pending_orders", [])
    request.session["pending_orders"] = [*pending_orders[-9:], merchant_order_id]
    # Persist a PENDING order in Supabase here before returning the session.
    # Access is never granted from this route or from frontend state.
    return {"paymentSessionId": session_id, "orderId": merchant_order_id}


@app.get("/api/payments/orders/{merchant_order_id}")
async def payment_status(merchant_order_id: str, request: Request) -> dict[str, str]:
    if not request.session.get("user") or merchant_order_id not in request.session.get("pending_orders", []):
        raise HTTPException(status_code=404, detail="Order not found.")
    required("CASHFREE_CLIENT_ID", "CASHFREE_CLIENT_SECRET")
    headers = {
        "x-client-id": os.environ["CASHFREE_CLIENT_ID"],
        "x-client-secret": os.environ["CASHFREE_CLIENT_SECRET"],
        "x-api-version": os.getenv("CASHFREE_API_VERSION", "2025-01-01"),
    }
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(f"{cashfree_base_url()}/orders/{merchant_order_id}", headers=headers)
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Unable to confirm payment right now.")
    order_status = response.json().get("order_status", "ACTIVE")
    return {"status": order_status}


@app.post("/api/payments/cashfree/webhook")
async def cashfree_webhook(request: Request) -> dict[str, bool]:
    required("CASHFREE_CLIENT_SECRET")
    raw_body = await request.body()
    timestamp = request.headers.get("x-webhook-timestamp", "")
    signature = request.headers.get("x-webhook-signature", "")
    signed_payload = timestamp.encode() + raw_body
    expected = base64.b64encode(hmac.new(os.environ["CASHFREE_CLIENT_SECRET"].encode(), signed_payload, hashlib.sha256).digest()).decode()
    if not timestamp or not signature or not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=401, detail="Invalid webhook signature.")
    event = await request.json()
    # On a verified successful payment, transaction verification and Supabase
    # updates happen here: mark order PAID, create purchase/product_access, and
    # enqueue delivery. Never infer success from a redirect or browser callback.
    payment_status = event.get("data", {}).get("payment", {}).get("payment_status")
    if payment_status == "SUCCESS":
        pass
    return {"ok": True}
