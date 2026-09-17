import express from "express";
import crypto from "crypto";
import { sb, writeLog } from "./admin.js";

const router = express.Router();
const TOKEN_SKEW_MS = 60_000;
let tokenCache = { value: "", expiresAt: 0 };

function config() {
  const production = String(process.env.PHONEPE_ENV || "sandbox").toLowerCase() === "production";
  return {
    production,
    clientId: String(process.env.PHONEPE_CLIENT_ID || ""),
    clientSecret: String(process.env.PHONEPE_CLIENT_SECRET || ""),
    clientVersion: String(process.env.PHONEPE_CLIENT_VERSION || "1"),
    callbackUsername: String(process.env.PHONEPE_CALLBACK_USERNAME || ""),
    callbackPassword: String(process.env.PHONEPE_CALLBACK_PASSWORD || ""),
    authUrl: production
      ? "https://api.phonepe.com/apis/identity-manager/v1/oauth/token"
      : "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token",
    payUrl: production
      ? "https://api.phonepe.com/apis/pg/checkout/v2/pay"
      : "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay",
    statusBaseUrl: production
      ? "https://api.phonepe.com/apis/pg/checkout/v2/order"
      : "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order",
    redirectUrl: String(process.env.PHONEPE_REDIRECT_URL || `${process.env.FRONTEND_URL || "https://convertflow-seven-delta.vercel.app"}/donate?phonepe=return`),
  };
}

function assertConfigured() {
  const c = config();
  if (!c.clientId || !c.clientSecret) {
    throw Object.assign(new Error("PhonePe payments are not configured yet."), { statusCode: 503 });
  }
  return c;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15_000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.message || data?.error || data?.code || `PhonePe returned HTTP ${response.status}.`;
    throw Object.assign(new Error(detail), { statusCode: 502 });
  }
  return data;
}

async function getAccessToken() {
  const c = assertConfigured();
  if (tokenCache.value && tokenCache.expiresAt > Date.now() + TOKEN_SKEW_MS) return tokenCache.value;
  const body = new URLSearchParams({
    client_id: c.clientId,
    client_version: c.clientVersion,
    client_secret: c.clientSecret,
    grant_type: "client_credentials",
  });
  const data = await fetchJson(c.authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const token = String(data?.access_token || "");
  if (!token) throw Object.assign(new Error("PhonePe did not return an access token."), { statusCode: 502 });
  const expiresInSeconds = Number(data?.expires_in || data?.expiresIn || 900);
  tokenCache = { value: token, expiresAt: Date.now() + Math.max(60, expiresInSeconds) * 1000 };
  return token;
}

async function phonePeRequest(url, options = {}) {
  const token = await getAccessToken();
  try {
    return await fetchJson(url, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `O-Bearer ${token}`, ...(options.headers || {}) },
    });
  } catch (error) {
    if (/401|unauthor/i.test(String(error.message || ""))) {
      tokenCache = { value: "", expiresAt: 0 };
      const retryToken = await getAccessToken();
      return fetchJson(url, {
        ...options,
        headers: { "Content-Type": "application/json", Authorization: `O-Bearer ${retryToken}`, ...(options.headers || {}) },
      });
    }
    throw error;
  }
}

async function findPayment(merchantOrderId) {
  const id = encodeURIComponent(String(merchantOrderId));
  const r = await sb(`/rest/v1/convertflow_phonepe_payments?merchant_order_id=eq.${id}&select=id,merchant_order_id,amount_paise,donor_name,state,phonepe_order_id,transaction_id,failure_code,failure_message,created_at,updated_at,completed_at`);
  const data = await r.json().catch(() => []);
  if (!r.ok || !data[0]) throw Object.assign(new Error("Donation payment was not found."), { statusCode: 404 });
  return data[0];
}

async function updatePayment(id, patch) {
  const r = await sb(`/rest/v1/convertflow_phonepe_payments?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
  if (!r.ok) throw Object.assign(new Error(`Supabase returned HTTP ${r.status}.`), { statusCode: 502 });
  const rows = await r.json().catch(() => []);
  return rows[0] || null;
}

async function ensureDonation(payment) {
  if (payment.state !== "COMPLETED") return;
  const existing = await sb(`/rest/v1/convertflow_donation_requests?merchant_order_id=eq.${encodeURIComponent(payment.merchant_order_id)}&select=id,name,status,merchant_order_id,amount_paise&limit=1`);
  const rows = await existing.json().catch(() => []);
  if (!existing.ok) throw Object.assign(new Error("Could not check the donation record."), { statusCode: 502 });
  if (rows[0]) return rows[0];

  const donation = {
    id: crypto.randomUUID(),
    name: payment.donor_name,
    status: "pending",
    merchant_order_id: payment.merchant_order_id,
    amount_paise: payment.amount_paise,
  };
  const created = await sb("/rest/v1/convertflow_donation_requests", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(donation),
  });
  if (created.ok) return (await created.json().catch(() => []))[0] || donation;
  const detail = await created.text().catch(() => "");
  if (/duplicate|unique/i.test(detail)) {
    const retry = await sb(`/rest/v1/convertflow_donation_requests?merchant_order_id=eq.${encodeURIComponent(payment.merchant_order_id)}&select=id,name,status,merchant_order_id,amount_paise&limit=1`);
    const retryRows = await retry.json().catch(() => []);
    return retryRows[0] || null;
  }
  throw Object.assign(new Error("Could not create the donation record."), { statusCode: 502 });
}

async function syncPaymentState(merchantOrderId) {
  const payment = await findPayment(merchantOrderId);
  const c = assertConfigured();
  const data = await phonePeRequest(`${c.statusBaseUrl}/${encodeURIComponent(merchantOrderId)}/status?details=false`, { method: "GET" });
  const state = String(data?.state || payment.state || "PENDING").toUpperCase();
  const details = Array.isArray(data?.paymentDetails) ? data.paymentDetails[0] : null;
  const updated = await updatePayment(payment.id, {
    state,
    phonepe_order_id: data?.orderId || payment.phonepe_order_id || null,
    transaction_id: details?.transactionId || data?.transactionId || payment.transaction_id || null,
    failure_code: data?.errorCode || data?.code || null,
    failure_message: data?.detailedErrorCode || data?.message || null,
    completed_at: state === "COMPLETED" ? payment.completed_at || new Date().toISOString() : payment.completed_at,
  });
  await ensureDonation(updated || { ...payment, state });
  return updated || { ...payment, state };
}

router.post("/create", async (req, res) => {
  try {
    const c = assertConfigured();
    const name = String(req.body?.name || "").trim().replace(/[<>]/g, "").slice(0, 80);
    const amountRupees = Number(req.body?.amount);
    if (!name) return res.status(400).json({ success: false, message: "Name is required." });
    if (!Number.isFinite(amountRupees) || amountRupees < 1 || amountRupees > 100000) return res.status(400).json({ success: false, message: "Donation amount must be between ₹1 and ₹100,000." });
    const amountPaise = Math.round(amountRupees * 100);
    const merchantOrderId = `CFDONATE_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;
    const inserted = await sb("/rest/v1/convertflow_phonepe_payments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ merchant_order_id: merchantOrderId, amount_paise: amountPaise, donor_name: name, state: "PENDING" }),
    });
    if (!inserted.ok) throw Object.assign(new Error("Could not start the donation payment."), { statusCode: 502 });
    const payment = (await inserted.json().catch(() => []))[0];
    const data = await phonePeRequest(c.payUrl, {
      method: "POST",
      body: JSON.stringify({
        merchantOrderId,
        amount: amountPaise,
        expireAfter: 1800,
        paymentFlow: {
          type: "PG_CHECKOUT",
          message: "Support ConvertFlow",
          merchantUrls: { redirectUrl: `${c.redirectUrl}${c.redirectUrl.includes("?") ? "&" : "?"}order=${encodeURIComponent(merchantOrderId)}` },
        },
      }),
    });
    if (!data?.redirectUrl) throw Object.assign(new Error("PhonePe did not return a checkout URL."), { statusCode: 502 });
    await updatePayment(payment.id, { phonepe_order_id: data.orderId || null, state: String(data.state || "PENDING").toUpperCase() });
    await writeLog("success", "donation.phonepe.started", "PhonePe donation checkout started", { merchantOrderId, amountPaise });
    return res.json({ success: true, merchantOrderId, redirectUrl: data.redirectUrl });
  } catch (e) {
    console.error("PhonePe create payment:", e);
    return res.status(e.statusCode || 502).json({ success: false, message: e.message || "Could not start PhonePe payment." });
  }
});

router.get("/status/:merchantOrderId", async (req, res) => {
  try {
    const orderId = String(req.params.merchantOrderId || "");
    if (!/^CFDONATE_[A-Za-z0-9_-]+$/.test(orderId)) return res.status(400).json({ success: false, message: "Invalid payment reference." });
    const payment = await syncPaymentState(orderId);
    return res.json({ success: true, state: payment.state });
  } catch (e) {
    console.error("PhonePe status:", e);
    return res.status(e.statusCode || 502).json({ success: false, message: e.message || "Could not verify the payment." });
  }
});

export async function handlePhonePeCallback(req, res) {
  const c = config();
  if (!c.clientId || !c.clientSecret || !c.callbackUsername || !c.callbackPassword) return res.status(503).json({ success: false, message: "PhonePe callback is not configured." });
  const authorization = String(req.headers.authorization || req.headers["x-verify"] || "");
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body || "");
  try {
    const expected = crypto.createHash("sha256").update(`${c.callbackUsername}:${c.callbackPassword}`).digest("hex");
    if (!authorization || !crypto.timingSafeEqual(Buffer.from(authorization), Buffer.from(expected))) {
      return res.status(401).json({ success: false, message: "Invalid PhonePe callback authorization." });
    }
    const payload = JSON.parse(rawBody);
    const orderId = String(payload?.payload?.merchantOrderId || payload?.payload?.merchantOrderID || payload?.payload?.orderId || "");
    if (!/^CFDONATE_[A-Za-z0-9_-]+$/.test(orderId)) return res.status(400).json({ success: false, message: "Invalid PhonePe order reference." });
    await syncPaymentState(orderId);
    await writeLog("success", "donation.phonepe.callback", "PhonePe callback verified", { merchantOrderId: orderId, state: payload?.payload?.state || payload?.type || "UNKNOWN" });
    return res.json({ success: true });
  } catch (e) {
    console.error("PhonePe callback:", e);
    return res.status(e.statusCode || 400).json({ success: false, message: "PhonePe callback could not be processed." });
  }
}

export default router;
