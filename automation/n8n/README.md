# ConvertFlow Render backend control

This folder contains the n8n workflow used by the `/admin` page to control the Render backend.

Render provides official API endpoints to retrieve, suspend, and resume services. The workflow keeps the Render API key and admin password inside n8n instead of shipping them to Vercel.

## 1. Import the workflow

Import `convertflow-render-control.json` into the n8n instance at `https://n8n-2-rgl6.onrender.com`.

Activate the workflow after importing it.

The webhook path is:

`/webhook/convertflow-render-control`

## 2. Add these n8n environment variables

Configure these variables on the n8n Render service:

- `RENDER_API_KEY`, your Render API key
- `RENDER_SERVICE_ID`, the service ID of `convertflow-backend`
- `CONVERTFLOW_ADMIN_PASSWORD`, a long random password used only for the admin panel

Do not put any of these secrets in GitHub or Vercel.

## 3. Configure Vercel

Add this environment variable to the ConvertFlow frontend project:

`VITE_ADMIN_CONTROL_WEBHOOK_URL=https://n8n-2-rgl6.onrender.com/webhook/convertflow-render-control`

Redeploy the frontend after adding the variable.

## 4. Use the panel

Open:

`https://convertflow-seven-delta.vercel.app/admin`

Enter the same `CONVERTFLOW_ADMIN_PASSWORD` configured in n8n.

The panel supports:

- backend status
- Turn Backend ON
- Turn Backend OFF
- manual status refresh
- automatic status refresh every 15 seconds

The `/admin` route is intentionally outside the normal `BackendGuard`, so it remains accessible even when the Render backend has been suspended.

## Security notes

The Render API uses Bearer API-key authentication. Never expose that key in frontend JavaScript, Vercel client environment variables, GitHub, or the browser. Only n8n should know the Render API key.

The workflow checks the admin password before calling Render. Keep the n8n webhook URL private enough for your use case and use a strong admin password.
