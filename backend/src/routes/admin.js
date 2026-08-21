import express from "express";
import crypto from "crypto";

const router = express.Router();
const TOKEN_TTL_SECONDS = 30 * 60;
function getSecret() { return process.env.ADMIN_CONTROL_SECRET || ""; }
function safeEqual(a, b) { const left = Buffer.from(String(a)); const right = Buffer.from(String(b)); return left.length === right.length && crypto.timingSafeEqual(left, right); }
function signToken(payload) { const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url"); const signature = crypto.createHmac("sha256", getSecret()).update(encoded).digest("base64url"); return `${encoded}.${signature}`; }
export function verifyAdminToken(token) { try { if (!getSecret() || !token) return false; const [encoded, signature] = String(token).split("."); if (!encoded || !signature) return false; const expected = crypto.createHmac("sha256", getSecret()).update(encoded).digest("base64url"); if (!safeEqual(signature, expected)) return false; const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")); return payload.role === "admin" && Number(payload.exp) > Math.floor(Date.now() / 1000); } catch { return false; } }
function requireAdmin(req, res, next) { const authorization = String(req.headers.authorization || ""); const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : ""; if (!verifyAdminToken(token)) return res.status(401).json({ success: false, message: "Unauthorized or expired admin session." }); return next(); }
function supabaseConfig() { return { url: String(process.env.SUPABASE_URL || "").replace(/\/$/, ""), key: String(process.env.SUPABASE_SERVICE_ROLE_KEY || "") }; }

async function callControlWebhook(action) {
  const webhookUrl = String(process.env.N8N_RENDER_CONTROL_WEBHOOK_URL || "").replace(/\/$/, ""); const webhookSecret = String(process.env.N8N_RENDER_CONTROL_SECRET || "");
  if (!webhookUrl || !webhookSecret) throw Object.assign(new Error("Render control is not configured on the backend."), { statusCode: 503 });
  const response = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json", "x-convertflow-admin-secret": webhookSecret }, body: JSON.stringify({ action }) });
  const text = await response.text(); let data = {}; try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!response.ok || data.success === false) throw Object.assign(new Error(data.message || `Control service returned HTTP ${response.status}.`), { statusCode: response.status });
  return data;
}
async function setSiteMode(mode) {
  const { url, key } = supabaseConfig(); if (!url || !key) throw Object.assign(new Error("Supabase site control is not configured."), { statusCode: 503 });
  const response = await fetch(`${url}/rest/v1/site_control?id=eq.1`, { method: "PATCH", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ mode, updated_at: new Date().toISOString() }) });
  if (!response.ok) throw Object.assign(new Error(`Supabase returned HTTP ${response.status}.`), { statusCode: 502 });
  return { success: true, mode };
}
async function setBackendEnabled(enabled) {
  const { url, key } = supabaseConfig(); if (!url || !key) throw Object.assign(new Error("Supabase site control is not configured."), { statusCode: 503 });
  const response = await fetch(`${url}/rest/v1/site_control?id=eq.1`, { method: "PATCH", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ backend_enabled: enabled, updated_at: new Date().toISOString() }) });
  if (!response.ok) throw Object.assign(new Error(`Supabase returned HTTP ${response.status}.`), { statusCode: 502 });
  return { success: true, backendEnabled: enabled };
}
async function getSiteControl() {
  const { url, key } = supabaseConfig(); if (!url || !key) throw Object.assign(new Error("Supabase site control is not configured."), { statusCode: 503 });
  const response = await fetch(`${url}/rest/v1/site_control?id=eq.1&select=mode,backend_enabled,updated_at`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  const data = await response.json().catch(() => []); if (!response.ok || !data[0]) throw Object.assign(new Error("Could not read site control."), { statusCode: 502 });
  return { success: true, mode: data[0].mode, backendEnabled: data[0].backend_enabled !== false, updatedAt: data[0].updated_at };
}

router.post("/login", (req, res) => { const password = String(req.body?.password || ""); const expectedPassword = String(process.env.ADMIN_PASSWORD || ""); if (!expectedPassword || !getSecret()) return res.status(503).json({ success: false, message: "Admin authentication is not configured." }); if (!safeEqual(password, expectedPassword)) return res.status(401).json({ success: false, message: "Invalid admin password." }); const now = Math.floor(Date.now() / 1000); return res.json({ success: true, token: signToken({ role: "admin", iat: now, exp: now + TOKEN_TTL_SECONDS }), expiresIn: TOKEN_TTL_SECONDS }); });
router.get("/session", (req, res) => { const authorization = String(req.headers.authorization || ""); const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : ""; return res.json({ success: verifyAdminToken(token) }); });

router.post("/control", requireAdmin, async (req, res) => {
  const action = String(req.body?.action || "").toLowerCase();
  if (!["status", "on", "off", "site-mode", "backend-access"].includes(action)) return res.status(400).json({ success: false, message: "Invalid admin control action." });
  try {
    if (action === "site-mode") { const mode = String(req.body?.mode || "").toLowerCase(); if (!["normal", "maintenance", "not_found"].includes(mode)) return res.status(400).json({ success: false, message: "Invalid site mode." }); return res.json(await setSiteMode(mode)); }
    if (action === "backend-access") { return res.json(await setBackendEnabled(req.body?.enabled === true)); }
    if (action === "off") { await setBackendEnabled(false); await setSiteMode("maintenance"); return res.json({ success: true, status: "frontend-blocked", backendEnabled: false, siteMode: "maintenance", message: "Frontend backend access is now disabled. Render remains online." }); }
    if (action === "on") { await setBackendEnabled(true); await setSiteMode("normal"); return res.json({ success: true, status: "frontend-enabled", backendEnabled: true, siteMode: "normal", message: "Frontend backend access is now enabled." }); }
    return res.json({ ...(await getSiteControl()), status: "frontend-controlled" });
  } catch (error) { console.error("Admin control error:", error); return res.status(error.statusCode || 502).json({ success: false, message: error.message || "Admin control request failed." }); }
});
router.get("/site-mode", requireAdmin, async (req, res) => { try { return res.json(await getSiteControl()); } catch (error) { return res.status(error.statusCode || 502).json({ success: false, message: error.message }); } });

function adminApiAuth(req, res, next) { return requireAdmin(req, res, next); }
function expiry(plan) { if (plan === "permanent") return null; const date = new Date(); if (plan === "month") date.setMonth(date.getMonth() + 1); else date.setFullYear(date.getFullYear() + 1); return date.toISOString(); }
router.post("/api-keys", adminApiAuth, async (req, res) => {
  const name = String(req.body?.name || "").trim(); const plan = String(req.body?.plan || "").toLowerCase();
  if (!name || name.length > 100) return res.status(400).json({ success: false, message: "Enter an API name up to 100 characters." });
  if (!["month", "year", "permanent"].includes(plan)) return res.status(400).json({ success: false, message: "Invalid expiry option." });
  const { url, key } = supabaseConfig(); if (!url || !key) return res.status(503).json({ success: false, message: "Supabase API licensing is not configured." });
  const apiKey = `cf_live_${crypto.randomBytes(32).toString("base64url")}`; const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex"); const expiresAt = expiry(plan);
  const response = await fetch(`${url}/rest/v1/convertflow_api_keys`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ name, key_hash: keyHash, key_prefix: apiKey.slice(0, 16), plan, expires_at: expiresAt }) });
  if (!response.ok) return res.status(502).json({ success: false, message: "Could not create API key." });
  return res.json({ success: true, apiKey, name, plan, expiresAt });
});
router.get("/api-keys", adminApiAuth, async (req, res) => {
  const { url, key } = supabaseConfig(); if (!url || !key) return res.status(503).json({ success: false, message: "Supabase API licensing is not configured." });
  await fetch(`${url}/rest/v1/convertflow_api_keys?expires_at=not.is.null&expires_at=lte.${encodeURIComponent(new Date().toISOString())}`, { method: "DELETE", headers: { apikey: key, Authorization: `Bearer ${key}` } }).catch(() => {});
  const response = await fetch(`${url}/rest/v1/convertflow_api_keys?revoked_at=is.null&order=created_at.desc&select=id,name,key_prefix,plan,expires_at,created_at,last_used_at`, { headers: { apikey: key, Authorization: `Bearer ${key}` } }); const data = await response.json().catch(() => []);
  if (!response.ok) return res.status(502).json({ success: false, message: "Could not load API keys." }); return res.json({ success: true, keys: data });
});
router.delete("/api-keys/:id", adminApiAuth, async (req, res) => { const { url, key } = supabaseConfig(); if (!url || !key) return res.status(503).json({ success: false, message: "Supabase API licensing is not configured." }); const response = await fetch(`${url}/rest/v1/convertflow_api_keys?id=eq.${encodeURIComponent(req.params.id)}`, { method: "DELETE", headers: { apikey: key, Authorization: `Bearer ${key}` } }); if (!response.ok) return res.status(502).json({ success: false, message: "Could not revoke API key." }); return res.json({ success: true }); });

export default router;
