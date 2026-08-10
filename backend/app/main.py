import os
import secrets
from pathlib import Path
from urllib.parse import urlencode

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


@app.get("/api/health")
async def health() -> dict[str, bool]:
    return {"ok": True}


@app.get("/api/auth/google/start")
async def google_sign_in(request: Request) -> RedirectResponse:
    required("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "SESSION_SECRET")
    state = secrets.token_urlsafe(32)
    request.session["oauth_state"] = state
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
    request.session["user"] = {"id": user["sub"], "email": user["email"], "name": user.get("name", "Customer")}
    return RedirectResponse(f"{FRONTEND_URL}/?signed_in=1#preview", status_code=303)


@app.post("/api/payments/checkout")
async def checkout(request: Request) -> dict[str, str]:
    if not request.session.get("user"):
        raise HTTPException(status_code=401, detail="Please sign in before checkout.")
    required("PHONEPE_CLIENT_ID", "PHONEPE_CLIENT_SECRET", "PHONEPE_CLIENT_VERSION")
    # PhonePe order creation must remain server-side. Integrate the merchant's
    # approved PhonePe Standard Checkout SDK/API here after their account is live.
    # No payment URL is fabricated when merchant credentials are unavailable.
    raise HTTPException(
        status_code=501,
        detail="PhonePe checkout needs the merchant account configuration before payments can be accepted.",
    )
