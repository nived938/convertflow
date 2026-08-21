import crypto from "crypto";

function config() {
  return {
    url: String(process.env.SUPABASE_URL || "").replace(/\/$/, ""),
    key: String(process.env.SUPABASE_SERVICE_ROLE_KEY || ""),
  };
}

function hashKey(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function requireApiKey(req, res, next) {
  const apiKey = String(req.headers["x-convertflow-api-key"] || req.headers["x-api-key"] || "").trim();
  if (!apiKey) return res.status(401).json({ success: false, message: "A ConvertFlow API key is required." });

  const { url, key } = config();
  if (!url || !key) return res.status(503).json({ success: false, message: "API licensing is not configured." });

  try {
    const keyHash = hashKey(apiKey);
    const response = await fetch(`${url}/rest/v1/convertflow_api_keys?key_hash=eq.${encodeURIComponent(keyHash)}&revoked_at=is.null&select=id,name,plan,expires_at`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const rows = await response.json().catch(() => []);
    if (!response.ok || !rows[0]) return res.status(401).json({ success: false, message: "Invalid or revoked ConvertFlow API key." });

    const license = rows[0];
    if (license.expires_at && new Date(license.expires_at).getTime() <= Date.now()) {
      await fetch(`${url}/rest/v1/convertflow_api_keys?id=eq.${license.id}`, {
        method: "DELETE",
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      }).catch(() => {});
      return res.status(403).json({ success: false, message: "This ConvertFlow API key has expired." });
    }

    await fetch(`${url}/rest/v1/convertflow_api_keys?id=eq.${license.id}`, {
      method: "PATCH",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ last_used_at: new Date().toISOString() }),
    }).catch(() => {});

    req.convertflowApiLicense = license;
    return next();
  } catch (error) {
    console.error("API key validation error:", error);
    return res.status(502).json({ success: false, message: "Could not validate the ConvertFlow API key." });
  }
}
