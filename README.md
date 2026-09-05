# 30D Embedded

## Run locally

1. Copy `backend/.env.example` to `backend/.env` and add your Google OAuth and PhonePe merchant credentials. Configure the Google redirect URI as `http://localhost:5173/api/auth/google/callback`.
2. Install and run the API:
   ```powershell
   py -m pip install -r backend/requirements.txt
   py -m uvicorn backend.app.main:app --reload --port 8000
   ```
3. In a second terminal, start the website:
   ```powershell
   npm.cmd install
   npm.cmd run dev
   ```

The Vite dev server proxies `/api` requests to FastAPI. Google sign-in will work once credentials and the redirect URI are configured. PhonePe checkout intentionally remains unavailable until the merchant's approved Standard Checkout account configuration is added; it never fabricates a payment success or exposes secrets to the browser.

## Deploying the frontend and API

Vercel serves the Vite frontend and proxies `/api/*` requests to the Render
FastAPI service configured in `vercel.json`. Keep `FRONTEND_URL` set to the
exact Vercel production URL, without a trailing slash.

For a launch targeting roughly 100–150 concurrent users, use a paid Render
web service (at least 1 GB RAM) and set this start command:

```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT --workers ${WEB_CONCURRENCY:-2} --timeout-keep-alive 30
```

Set `WEB_CONCURRENCY=2`, `HTTP_MAX_CONNECTIONS=100`,
`HTTP_MAX_KEEPALIVE_CONNECTIONS=40`, and `MAX_CONCURRENT_REQUESTS=120` in
Render. These limits apply per worker; the API keeps shared outbound
connections to Supabase and Cashfree rather than opening one per request.

In Render, add these environment variables for the Production environment:
`APP_ENV=production`, `FRONTEND_URL` (the exact production site URL, without a
trailing slash), `SESSION_SECRET`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SUPABASE_URL`, and
`SUPABASE_SERVICE_ROLE_KEY` (plus the Cashfree variables when checkout is
enabled). Never commit them to the repository.

In Google Cloud Console, configure this exact authorized redirect URI:
`https://embed-forge.vercel.app/api/auth/google/callback`. Use your own Vercel
production domain instead if it differs. Redeploy after changing Vercel
environment variables.

## Required Supabase and Cashfree setup

Before deploying the purchase and single-device session features, apply the
Supabase migrations, including `202608250002_purchases_and_single_session.sql`
and `202609040003_coupon_redemptions.sql`:

```powershell
supabase db push
```

Set `SUPABASE_STORAGE_BUCKET=embed-forge-materials` in Vercel and make that
bucket **private**. The learning-kit screen lists objects through the backend
only after purchase and active-session checks, then uses five-minute signed
Supabase Storage URLs for individual files.

In Cashfree Dashboard, configure the payment webhook as
`https://embed-forge.vercel.app/api/payments/cashfree/webhook` and subscribe to
payment-success events. The backend verifies the Cashfree signature from the
raw request before granting access. The return page also verifies the order
with Cashfree, so a legitimate paid order can activate even if the webhook is
delayed.

## Coupon configuration

`EMBEDFORGE49` is handled exclusively by the backend and database. It changes
the ₹49 price to ₹29 (₹20 / 40.82% off) and is capped at 50 successful
redemptions. The database reserves a slot for 30 minutes while Cashfree
checkout is active, releases it if payment fails or is abandoned, and finalizes
it exactly once after verified payment. Do not enable coupon checkout until the
coupon migration has been applied.
