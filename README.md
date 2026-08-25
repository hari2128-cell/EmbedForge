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

## Deploying to Vercel

Vercel serves the Vite site and the FastAPI app from the same deployment. The
root `api/index.py` function forwards all `/api/*` requests to the backend, so
no frontend API URL needs to change.

In the Vercel project settings, add these environment variables for the
Production environment: `APP_ENV=production`, `FRONTEND_URL` (the exact
production site URL, without a trailing slash), `SESSION_SECRET`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SUPABASE_URL`, and
`SUPABASE_SERVICE_ROLE_KEY` (plus the Cashfree variables when checkout is
enabled). Never commit them to the repository.

In Google Cloud Console, configure this exact authorized redirect URI:
`https://embed-forge.vercel.app/api/auth/google/callback`. Use your own Vercel
production domain instead if it differs. Redeploy after changing Vercel
environment variables.

## Required Supabase and Cashfree setup

Before deploying the purchase and single-device session features, apply the
Supabase migrations, including `202608250002_purchases_and_single_session.sql`:

```powershell
supabase db push
```

Set `PRODUCT_DRIVE_URL` in Vercel to the HTTPS learning-kit URL. The app only
redirects to that URL after a verified paid purchase and while the account's
one active browser session remains valid. If this is a public Google Drive link,
anyone with the copied final link can still access it; make the destination
restricted to the purchaser's Google account or host the content behind this
application for full enforcement.

In Cashfree Dashboard, configure the payment webhook as
`https://embed-forge.vercel.app/api/payments/cashfree/webhook` and subscribe to
payment-success events. The backend verifies the Cashfree signature from the
raw request before granting access. The return page also verifies the order
with Cashfree, so a legitimate paid order can activate even if the webhook is
delayed.
