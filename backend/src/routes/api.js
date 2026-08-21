import express from "express";
import crypto from "crypto";
import { verifyAdminToken } from "./admin.js";

const router = express.Router();

function supabase() {
  return {
    url: String(process.env.SUPABASE_URL || "").replace(/\/$/, ""),
    key: String(process.env.SUPABASE_SERVICE_ROLE_KEY || ""),
  };
}
function adminOnly(req, res, next) {
  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!verifyAdminToken(token)) return res.status(401).json({ success: false, message: "Unauthorized." });
  next();
}
function planExpiry(plan) {
  if (plan === "permanent") return null;
  const date = new Date();
  if (plan === "month") date.setMonth(date.getMonth() + 1);
  else date.setFullYear(date.getFullYear() + 1);
  return date.toISOString();
}

router.post("/keys", adminOnly, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const plan = String(req.body?.plan || "").toLowerCase();
  if (!name || name.length > 100) return res.status(400).json({ success: false, message: "Enter an API name up to 100 characters." });
  if (!["month", "year", "permanent"].includes(plan)) return res.status(400).json({ success: false, message: "Invalid API expiry option." });

  const { url, key } = supabase();
  if (!url || !key) return res.status(503).json({ success: false, message: "Supabase API licensing is not configured." });

  const rawKey = `cf_live_${crypto.randomBytes(32).toString("base64url")}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const expiresAt = planExpiry(plan);
  const response = await fetch(`${url}/rest/v1/convertflow_api_keys`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ name, key_hash: keyHash, key_prefix: rawKey.slice(0, 16), plan, expires_at: expiresAt }),
  });
  if (!response.ok) {
    const text = await response.text();
    console.error("Create API key error:", text);
    return res.status(502).json({ success: false, message: "Could not create API key." });
  }
  return res.json({ success: true, apiKey: rawKey, name, plan, expiresAt });
});

router.get("/keys", adminOnly, async (req, res) => {
  const { url, key } = supabase();
  if (!url || !key) return res.status(503).json({ success: false, message: "Supabase API licensing is not configured." });
  await fetch(`${url}/rest/v1/convertflow_api_keys?expires_at=not.is.null&expires_at=lte.${encodeURIComponent(new Date().toISOString())}`, { method: "DELETE", headers: { apikey: key, Authorization: `Bearer ${key}` } }).catch(() => {});
  const response = await fetch(`${url}/rest/v1/convertflow_api_keys?revoked_at=is.null&order=created_at.desc&select=id,name,key_prefix,plan,expires_at,created_at,last_used_at`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  const data = await response.json().catch(() => []);
  if (!response.ok) return res.status(502).json({ success: false, message: "Could not load API keys." });
  return res.json({ success: true, keys: data });
});

router.delete("/keys/:id", adminOnly, async (req, res) => {
  const { url, key } = supabase();
  if (!url || !key) return res.status(503).json({ success: false, message: "Supabase API licensing is not configured." });
  const response = await fetch(`${url}/rest/v1/convertflow_api_keys?id=eq.${encodeURIComponent(req.params.id)}`, { method: "DELETE", headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!response.ok) return res.status(502).json({ success: false, message: "Could not revoke API key." });
  return res.json({ success: true });
});

export default router;
