# ConvertFlow Render backend control

This folder contains the n8n workflow used by the `/admin` pages to control the Render backend.

## Security architecture

The admin password is entered only on the separate `/admin` login page. Node.js verifies the password and issues a short-lived signed admin session token. The controls page at `/admin/control` never receives or stores the password.

The n8n workflow verifies that signed token before it can call the Render API. The Render API key stays only in n8n.

This also means an authenticated controls page can still request **Turn Backend ON** after the ConvertFlow backend has been suspended, because n8n remains running separately.

## 1. Import the workflow

Import `convertflow-render-control.json` into the n8n instance at `https://n8n-2-rgl6.onrender.com` and activate it.

Webhook path:

`/webhook/convertflow-render-control`

## 2. Add these n8n environment variables

Configure these variables on the **n8n Render service**:

- `RENDER_API_KEY`, your Render API key
- `RENDER_SERVICE_ID`, the service ID of `convertflow-backend`
- `ADMIN_CONTROL_SECRET`, a long random secret. It must exactly match the backend's `ADMIN_CONTROL_SECRET`.

Do not put these secrets in GitHub or Vercel.

## 3. Add these backend Render environment variables

Configure these on the **convertflow-backend Render service**:

- `ADMIN_PASSWORD`, your private admin password
- `ADMIN_CONTROL_SECRET`, the exact same long random secret used in n8n

Use a strong random value for `ADMIN_CONTROL_SECRET`. Never commit it to GitHub.

## 4. Configure Vercel

Keep this frontend environment variable:

`VITE_ADMIN_CONTROL_WEBHOOK_URL=https://n8n-2-rgl6.onrender.com/webhook/convertflow-render-control`

Redeploy the frontend after changing environment variables.

## 5. Use the panel

Open:

`https://convertflow-seven-delta.vercel.app/admin`

Enter your `ADMIN_PASSWORD`. After successful login you are sent to:

`/admin/control`

The controls page supports backend status, Turn Backend ON, Turn Backend OFF, manual refresh, automatic refresh, and sign out.

## Important

The old `CONVERTFLOW_ADMIN_PASSWORD` n8n variable is no longer used by the updated workflow. Remove it after the new setup is working.

The Render API key is never sent to Vercel or the browser.
