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
