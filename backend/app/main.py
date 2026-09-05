import os
import secrets
import base64
import hashlib
import hmac
import logging
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote, urlencode

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from starlette.middleware.sessions import SessionMiddleware

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

app = FastAPI(title="30D Embedded API")
logger = logging.getLogger(__name__)
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", ""),
    https_only=os.getenv("APP_ENV") == "production",
    same_site="lax",
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
PRODUCT_PRICE_INR = 49
COUPON_CODE = "EMBEDFORGE49"
COUPON_PRICE_INR = 29
PRODUCT_SLUG = "30-day-microcontroller-learning-kit"
MATERIALS_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "embed-forge-materials")


@app.exception_handler(httpx.HTTPError)
async def upstream_http_error(_: Request, exc: httpx.HTTPError) -> JSONResponse:
    """Do not expose DNS/network traces to users when an upstream is unreachable."""
    logger.warning("Upstream service request failed: %s", type(exc).__name__)
    return JSONResponse(
        status_code=503,
        content={"detail": "A required service is temporarily unreachable. Check your connection and try again."},
    )


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


def session_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def active_user(request: Request) -> dict[str, str] | None:
    """Return the user only while this browser owns the account's active session."""
    user = request.session.get("user")
    token = request.session.get("active_session_token")
    if not user or not token:
        return None
    required("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"{os.environ['SUPABASE_URL'].rstrip('/')}/rest/v1/profiles",
            params={"select": "id", "id": f"eq.{user['id']}", "active_session_hash": f"eq.{session_token_hash(token)}"},
            headers=supabase_headers(),
        )
    if response.status_code >= 400 or not response.json():
        request.session.clear()
        return None
    return user


async def claim_active_session(user_id: str, token: str) -> bool:
    """Atomically claim the account only when no other device is signed in."""
    required("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.patch(
            f"{os.environ['SUPABASE_URL'].rstrip('/')}/rest/v1/profiles",
            params={"id": f"eq.{user_id}", "active_session_hash": "is.null"},
            headers={**supabase_headers(), "Prefer": "return=representation"},
            json={"active_session_hash": session_token_hash(token)},
        )
    if response.status_code >= 400:
        logger.warning("Could not claim account session: Supabase returned %s", response.status_code)
        raise HTTPException(status_code=503, detail="Account session storage is unavailable.")
    try:
        return bool(response.json())
    except ValueError:
        # With return=representation, a successful conditional update has a
        # response body. An empty response therefore means another session won.
        return False


async def release_active_session(user_id: str, token: str) -> None:
    if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
        return
    async with httpx.AsyncClient(timeout=10) as client:
        await client.patch(
            f"{os.environ['SUPABASE_URL'].rstrip('/')}/rest/v1/profiles",
            params={"id": f"eq.{user_id}", "active_session_hash": f"eq.{session_token_hash(token)}"},
            headers=supabase_headers(),
            json={"active_session_hash": None},
        )


async def replace_active_session(user_id: str, token: str) -> bool:
    """Invalidate the prior device by replacing its only stored session hash."""
    required("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.patch(
            f"{os.environ['SUPABASE_URL'].rstrip('/')}/rest/v1/profiles",
            params={"id": f"eq.{user_id}"},
            headers={**supabase_headers(), "Prefer": "return=representation"},
            json={"active_session_hash": session_token_hash(token)},
        )
    # A successful update may legitimately be returned as HTTP 204 by PostgREST,
    # so do not require a JSON response body to complete a verified takeover.
    if response.status_code >= 400:
        logger.warning("Could not replace account session: Supabase returned %s", response.status_code)
        raise HTTPException(status_code=503, detail="Account session storage is unavailable. Apply the Supabase session migration, then try again.")
    return True


async def has_product_access(user_id: str) -> bool:
    required("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"{os.environ['SUPABASE_URL'].rstrip('/')}/rest/v1/purchases",
            params={"select": "order_id", "user_id": f"eq.{user_id}", "product_slug": f"eq.{PRODUCT_SLUG}", "status": "eq.PAID", "limit": "1"},
            headers=supabase_headers(),
        )
    return response.status_code < 400 and bool(response.json())


async def save_purchase(order_id: str, user_id: str, status: str, amount_inr: int = PRODUCT_PRICE_INR, coupon_code: str | None = None) -> None:
    required("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"{os.environ['SUPABASE_URL'].rstrip('/')}/rest/v1/purchases?on_conflict=order_id",
            headers={**supabase_headers(), "Prefer": "resolution=merge-duplicates,return=minimal"},
            json={"order_id": order_id, "user_id": user_id, "product_slug": PRODUCT_SLUG, "status": status, "amount_inr": amount_inr, "coupon_code": coupon_code, "paid_at": datetime.now(timezone.utc).isoformat() if status == "PAID" else None},
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=503, detail="Unable to record purchase status. Please try again.")


async def mark_purchase_paid(order_id: str) -> None:
    required("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.patch(
            f"{os.environ['SUPABASE_URL'].rstrip('/')}/rest/v1/purchases",
            params={"order_id": f"eq.{order_id}"},
            headers=supabase_headers(),
            json={"status": "PAID", "paid_at": datetime.now(timezone.utc).isoformat()},
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=503, detail="Unable to activate purchase access. Please try again.")
    await call_coupon_rpc("finalize_embedforge_coupon", {"p_order_id": order_id}, tolerate_missing=True)


async def call_coupon_rpc(name: str, payload: dict[str, object], tolerate_missing: bool = False) -> object | None:
    required("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(f"{os.environ['SUPABASE_URL'].rstrip('/')}/rest/v1/rpc/{name}", headers=supabase_headers(), json=payload)
    if response.status_code >= 400:
        logger.warning("Coupon RPC %s failed with status %s", name, response.status_code)
        if tolerate_missing:
            return None
        raise HTTPException(status_code=503, detail="Coupon service is unavailable. Apply the coupon migration, then try again.")
    return response.json()


async def reserve_coupon(order_id: str, user_id: str, coupon: str) -> int:
    if coupon.upper() != COUPON_CODE:
        raise HTTPException(status_code=422, detail="Invalid coupon code.")
    response = await call_coupon_rpc("reserve_embedforge_coupon", {"p_order_id": order_id, "p_user_id": user_id})
    result = response[0] if isinstance(response, list) and response else None
    if not isinstance(result, dict) or not result.get("accepted"):
        reason = result.get("reason") if isinstance(result, dict) else "unavailable"
        raise HTTPException(status_code=409, detail="This coupon has reached its redemption limit." if reason == "limit_reached" else "Invalid coupon code.")
    return int(result.get("amount_inr", COUPON_PRICE_INR))


async def set_purchase_failed(order_id: str) -> None:
    required("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")
    async with httpx.AsyncClient(timeout=10) as client:
        await client.patch(f"{os.environ['SUPABASE_URL'].rstrip('/')}/rest/v1/purchases", params={"order_id": f"eq.{order_id}"}, headers=supabase_headers(), json={"status": "FAILED"})
    await call_coupon_rpc("release_embedforge_coupon", {"p_order_id": order_id}, tolerate_missing=True)


def safe_storage_path(path: str) -> str:
    path = path.strip().strip("/")
    if ".." in path.split("/") or "\\" in path or "\x00" in path:
        raise HTTPException(status_code=400, detail="Invalid material path.")
    return path


async def require_material_access(request: Request) -> dict[str, str]:
    user = await active_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Please sign in to open the learning kit.")
    if not await has_product_access(str(user["id"])):
        raise HTTPException(status_code=403, detail="A verified purchase is required to open the learning kit.")
    return user


async def list_materials(prefix: str) -> list[dict[str, object]]:
    required("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")
    storage_base = f"{os.environ['SUPABASE_URL'].rstrip('/')}/storage/v1"
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            f"{storage_base}/object/list/{quote(MATERIALS_BUCKET, safe='')}",
            headers=supabase_headers(),
            json={"prefix": prefix, "limit": 100, "offset": 0, "sortBy": {"column": "name", "order": "asc"}},
        )
        if response.status_code >= 400:
            raise HTTPException(status_code=503, detail="Unable to load learning materials.")
        raw_items = response.json()
        files = [f"{prefix}/{item['name']}".strip("/") for item in raw_items if item.get("id")]
        signed: dict[str, str] = {}
        if files:
            signed_response = await client.post(
                f"{storage_base}/object/sign/{quote(MATERIALS_BUCKET, safe='')}",
                headers=supabase_headers(),
                json={"expiresIn": 300, "paths": files},
            )
            if signed_response.status_code >= 400:
                raise HTTPException(status_code=503, detail="Unable to prepare learning materials.")
            signed = {str(item["path"]): f"{storage_base}{item['signedURL']}" for item in signed_response.json() if item.get("signedURL")}

    return [
        {
            "name": str(item["name"]),
            "path": f"{prefix}/{item['name']}".strip("/"),
            "isFolder": not bool(item.get("id")),
            "url": signed.get(f"{prefix}/{item['name']}".strip("/")),
        }
        for item in raw_items
    ]


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
    user = await active_user(request)
    return {"authenticated": bool(user), "user": user, "hasAccess": bool(user and await has_product_access(user["id"]))}


@app.post("/api/auth/sign-out")
async def sign_out(request: Request) -> dict[str, bool]:
    user = request.session.get("user")
    token = request.session.get("active_session_token")
    if user and token:
        await release_active_session(str(user["id"]), str(token))
    request.session.clear()
    return {"ok": True}


@app.get("/api/auth/google/start")
async def google_sign_in(request: Request, next: str = "/") -> RedirectResponse:
    required("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "SESSION_SECRET")
    state = secrets.token_urlsafe(32)
    # A browser can begin sign-in from more than one tab. Keep a short-lived
    # set of pending states instead of overwriting the first tab's state.
    oauth_attempts = request.session.get("oauth_attempts", {})
    now = int(time.time())
    oauth_attempts = {
        saved_state: attempt
        for saved_state, attempt in oauth_attempts.items()
        if isinstance(attempt, dict) and int(attempt.get("created_at", 0)) >= now - 600
    }
    oauth_attempts[state] = {"next": safe_app_path(next), "created_at": now}
    request.session["oauth_attempts"] = dict(list(oauth_attempts.items())[-5:])
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
    oauth_attempts = request.session.get("oauth_attempts", {})
    attempt = oauth_attempts.pop(state, None)
    request.session["oauth_attempts"] = oauth_attempts
    if not attempt or not isinstance(attempt, dict):
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
    # Tabs in the same browser share a cookie. If this account already owns
    # this session, do not create a competing login or show a takeover prompt.
    existing_user = await active_user(request)
    if existing_user and existing_user["id"] == supabase_user["id"]:
        destination = safe_app_path(str(attempt.get("next", "/")))
        return RedirectResponse(f"{FRONTEND_URL}{destination}", status_code=303)
    if existing_user:
        existing_token = request.session.get("active_session_token")
        if existing_token:
            await release_active_session(str(existing_user["id"]), str(existing_token))
    active_session_token = secrets.token_urlsafe(32)
    try:
        claimed = await claim_active_session(supabase_user["id"], active_session_token)
    except HTTPException:
        request.session.clear()
        return RedirectResponse(f"{FRONTEND_URL}/?sign_in_error=session_unavailable", status_code=303)
    if not claimed:
        request.session.clear()
        request.session["takeover_user"] = supabase_user
        return RedirectResponse(f"{FRONTEND_URL}/?sign_in_error=active_session", status_code=303)
    request.session["user"] = supabase_user
    request.session["active_session_token"] = active_session_token
    destination = safe_app_path(str(attempt.get("next", "/")))
    # Google sign-in always lands at the top of the website unless an internal
    # protected route explicitly requested the sign-in flow.
    if destination in {"/", "/philosophy", "/path", "/preview"}:
        destination = "/"
    separator = "&" if "?" in destination else "?"
    return RedirectResponse(f"{FRONTEND_URL}{destination}{separator}signed_in=1", status_code=303)


@app.post("/api/auth/sign-out-other-devices")
async def sign_out_other_devices(request: Request) -> dict[str, object]:
    """Complete a Google-verified login by revoking the previously active device."""
    user = request.session.get("takeover_user")
    if not user or not user.get("id"):
        raise HTTPException(status_code=400, detail="Start Google sign-in again before taking over this account.")
    token = secrets.token_urlsafe(32)
    if not await replace_active_session(str(user["id"]), token):
        raise HTTPException(status_code=503, detail="Unable to sign out the other device. Please try again.")
    request.session.clear()
    request.session["user"] = user
    request.session["active_session_token"] = token
    return {"ok": True, "user": user}


def cashfree_base_url() -> str:
    return "https://sandbox.cashfree.com/pg" if os.getenv("CASHFREE_ENV", "SANDBOX").upper() == "SANDBOX" else "https://api.cashfree.com/pg"


@app.post("/api/payments/checkout")
async def checkout(request: Request) -> dict[str, str]:
    user = await active_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Please sign in before checkout.")
    required("CASHFREE_CLIENT_ID", "CASHFREE_CLIENT_SECRET")
    body = await request.json()
    phone = str(body.get("phone", "")).strip()
    coupon = str(body.get("coupon", "")).strip().upper()
    if not phone or len(phone) < 10 or len(phone) > 15 or not phone.replace("+", "", 1).isdigit():
        raise HTTPException(status_code=422, detail="Please provide a valid phone number for checkout.")
    merchant_order_id = f"ef_{uuid.uuid4().hex[:24]}"
    amount_inr = PRODUCT_PRICE_INR
    await save_purchase(merchant_order_id, str(user["id"]), "PENDING")
    try:
        if coupon:
            amount_inr = await reserve_coupon(merchant_order_id, str(user["id"]), coupon)
            await save_purchase(merchant_order_id, str(user["id"]), "PENDING", amount_inr, coupon)
    except HTTPException:
        await set_purchase_failed(merchant_order_id)
        raise
    payload = {
        "order_id": merchant_order_id,
        "order_amount": amount_inr,
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
        await set_purchase_failed(merchant_order_id)
        raise HTTPException(status_code=502, detail="Checkout is temporarily unavailable. Please try again shortly.")
    data = response.json()
    session_id = data.get("payment_session_id")
    if not session_id:
        await set_purchase_failed(merchant_order_id)
        raise HTTPException(status_code=502, detail="Checkout is temporarily unavailable. Please try again shortly.")
    pending_orders = request.session.get("pending_orders", [])
    request.session["pending_orders"] = [*pending_orders[-9:], merchant_order_id]
    # Persist a PENDING order in Supabase here before returning the session.
    # Access is never granted from this route or from frontend state.
    return {"paymentSessionId": session_id, "orderId": merchant_order_id, "amount": str(amount_inr)}


@app.get("/api/payments/orders/{merchant_order_id}")
async def payment_status(merchant_order_id: str, request: Request) -> dict[str, str]:
    user = await active_user(request)
    if not user or merchant_order_id not in request.session.get("pending_orders", []):
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
    if order_status == "PAID":
        await mark_purchase_paid(merchant_order_id)
    elif order_status in {"EXPIRED", "TERMINATED", "FAILED"}:
        await set_purchase_failed(merchant_order_id)
    return {"status": order_status}


@app.post("/api/payments/coupon")
async def validate_coupon(request: Request) -> dict[str, object]:
    user = await active_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Please sign in before applying a coupon.")
    code = str((await request.json()).get("coupon", "")).strip().upper()
    if code != COUPON_CODE:
        raise HTTPException(status_code=422, detail="Invalid coupon code.")
    return {"valid": True, "code": COUPON_CODE, "amount": COUPON_PRICE_INR, "discount": 20, "discountPercent": 40.82}


@app.get("/api/access/tool")
async def open_learning_kit(request: Request) -> RedirectResponse:
    await require_material_access(request)
    return RedirectResponse(f"{FRONTEND_URL}/learning-kit", status_code=303)


@app.get("/api/access/materials")
async def learning_materials(request: Request, path: str = "") -> dict[str, object]:
    await require_material_access(request)
    safe_path = safe_storage_path(path)
    return {"path": safe_path, "items": await list_materials(safe_path)}


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
        data = event.get("data", {})
        order_id = data.get("order", {}).get("order_id") or data.get("payment", {}).get("order_id") or data.get("order_id")
        if order_id:
            await mark_purchase_paid(str(order_id))
    return {"ok": True}
