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
