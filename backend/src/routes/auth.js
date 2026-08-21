import crypto from "crypto";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserPassword,
  recordLoginEvent,
} from "../models/userModel.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
const MAX_CODE_ATTEMPTS = 5;

function normalizeEmail(email) { return email?.trim().toLowerCase(); }
function getCodeTtlMinutes() {
  const value = Number(process.env.LOGIN_CODE_TTL_MINUTES || 10);
  return Number.isFinite(value) ? Math.min(Math.max(value, 5), 30) : 10;
}
function hashCode(code) {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured.");
  return crypto.createHmac("sha256", process.env.JWT_SECRET).update(code).digest("hex");
}
function configReady() {
  return Boolean(process.env.N8N_LOGIN_WEBHOOK_URL && process.env.N8N_WEBHOOK_SECRET && process.env.JWT_SECRET && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function setSessionCookie(res, user) {
  const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "30d" });
  res.cookie("convertflow_token", token, {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  return token;
}
function verificationUnavailable(res) {
  return res.status(503).json({ success: false, message: "Email verification is not configured yet. Please try again later." });
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured on the backend.");
  return { url, key };
}

async function supabaseAuthRequest(path, options = {}) {
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  return { response, data };
}

async function signInWithSupabase(email, password) {
  const { response, data } = await supabaseAuthRequest("/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) return null;
  return data.user || null;
}

async function findSupabaseAuthUser(email) {
  const { response, data } = await supabaseAuthRequest("/admin/users?page=1&per_page=1000", { method: "GET" });
  if (!response.ok) throw new Error(`Supabase Auth user lookup failed (${response.status}).`);
  return (data.users || []).find((candidate) => normalizeEmail(candidate.email) === email) || null;
}

async function updateSupabaseAuthPassword(email, password) {
  const authUser = await findSupabaseAuthUser(email);
  if (!authUser?.id) throw new Error("Supabase Auth user was not found.");
  const { response, data } = await supabaseAuthRequest(`/admin/users/${authUser.id}`, {
    method: "PUT",
    body: JSON.stringify({ password, email_confirm: true }),
  });
  if (!response.ok) throw new Error(`Supabase Auth password update failed (${response.status}): ${data?.message || data?.msg || "unknown error"}`);
}

async function sendEmailCode(user, type) {
  const code = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + getCodeTtlMinutes() * 60000).toISOString();
  const response = await fetch(process.env.N8N_LOGIN_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-convertflow-secret": process.env.N8N_WEBHOOK_SECRET },
    body: JSON.stringify({ type, email: user.email, code, expiresInMinutes: getCodeTtlMinutes(), expiresAt }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`n8n responded with ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`);
  }
  return { codeHash: hashCode(code), expiresAt };
}

async function createVerification(user, type) {
  const { codeHash, expiresAt } = await sendEmailCode(user, type);
  const { supabaseVerification } = await import("../services/supabaseVerification.js");
  await supabaseVerification.upsert({ userId: user.id, type, codeHash, expiresAt, attempts: 0 });
}

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !password) return res.status(400).json({ success: false, message: "Email and password are required." });
    if (password.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
    if (!configReady()) return verificationUnavailable(res);
    if (await findUserByEmail(normalizedEmail)) return res.status(409).json({ success: false, message: "An account with this email already exists." });
    const user = await createUser(normalizedEmail, await bcrypt.hash(password, 12));
    try {
      await createVerification(user, "login_code");
      await recordLoginEvent(user, "registration_verification_requested");
    } catch (error) {
      console.error("Registration verification email error:", error);
      return res.status(503).json({ success: false, message: "We could not send your verification code. Please check the n8n email workflow." });
    }
    return res.status(201).json({ success: true, requiresVerification: true, email: user.email });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(503).json({ success: false, message: "Authentication database is unavailable. Check the Render Supabase environment variables and logs." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !password) return res.status(400).json({ success: false, message: "Email and password are required." });

    let user = await findUserByEmail(normalizedEmail);
    let syncedSupabaseAuthUser = false;

    if (!user || !user.password_hash) {
      const authUser = await signInWithSupabase(normalizedEmail, password);
      if (!authUser) return res.status(401).json({ success: false, message: "Invalid email or password." });
      if (!user) {
        user = await createUser(normalizedEmail, null);
        syncedSupabaseAuthUser = true;
      }
    } else {
      let passwordMatches = false;
      try { passwordMatches = await bcrypt.compare(password, user.password_hash); }
      catch (error) {
        console.error("Password comparison error:", error);
        return res.status(503).json({ success: false, message: "The account password data is unavailable. Please create the account again." });
      }
      if (!passwordMatches) return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    if (!configReady()) return verificationUnavailable(res);

    try {
      await createVerification(user, "login_code");
      if (!syncedSupabaseAuthUser) await recordLoginEvent(user, "login_verification_requested");
    } catch (error) {
      console.error("Login verification email error:", error);
      return res.status(503).json({ success: false, message: "We could not send your verification code. Please check the n8n email workflow." });
    }
    return res.json({ success: true, requiresVerification: true, email: user.email });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(503).json({ success: false, message: "Authentication database is unavailable. Check the Render Supabase environment variables and logs." });
  }
});

async function verifyCode(user, type, code) {
  const { supabaseVerification } = await import("../services/supabaseVerification.js");
  const record = await supabaseVerification.find(user.id, type);
  if (!record || new Date(record.expires_at) <= new Date()) {
    await supabaseVerification.remove(user.id, type);
    throw new Error("That code has expired. Request a new one.");
  }
  const expected = Buffer.from(record.code_hash, "hex");
  const received = Buffer.from(hashCode(code), "hex");
  const matches = expected.length === received.length && crypto.timingSafeEqual(expected, received);
  if (!matches) {
    const attempts = record.attempts + 1;
    if (attempts >= MAX_CODE_ATTEMPTS) await supabaseVerification.remove(user.id, type);
    else await supabaseVerification.incrementAttempts(user.id, type, attempts);
    throw new Error("That verification code is not valid.");
  }
  await supabaseVerification.remove(user.id, type);
}

router.post("/verify-login", async (req, res) => {
  try {
    const user = await findUserByEmail(normalizeEmail(req.body?.email));
    const code = String(req.body?.code || "").trim();
    if (!user || !/^\d{6}$/.test(code)) return res.status(400).json({ success: false, message: "Enter the six-digit code from your email." });
    await verifyCode(user, "login_code", code);
    const token = setSessionCookie(res, user);
    try { await recordLoginEvent(user, "login_success"); } catch (eventError) { console.error("Login event recording failed:", eventError); }
    return res.json({ success: true, token, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error("Login verification error:", error);
    return res.status(401).json({ success: false, message: error.message || "Could not verify your code." });
  }
});

router.post("/request-password-reset", async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);
    if (!normalizedEmail) return res.status(400).json({ success: false, message: "Email is required." });
    if (!configReady()) return verificationUnavailable(res);

    let user = await findUserByEmail(normalizedEmail);
    let syncedSupabaseAuthUser = false;

    if (!user) {
      const authUser = await findSupabaseAuthUser(normalizedEmail);
      if (!authUser) return res.json({ success: true, message: "If an account exists for this email, a reset code has been sent." });
      user = await createUser(normalizedEmail, null);
      syncedSupabaseAuthUser = true;
    }

    await createVerification(user, "password_reset");
    if (!syncedSupabaseAuthUser) {
      try { await recordLoginEvent(user, "password_reset_requested"); }
      catch (eventError) { console.error("Password reset event recording failed:", eventError); }
    }
    return res.json({ success: true, message: "If an account exists for this email, a reset code has been sent." });
  } catch (error) {
    console.error("Password reset request error:", error);
    return res.status(503).json({ success: false, message: "We could not send your reset code. Please check the n8n email workflow." });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);
    const user = await findUserByEmail(normalizedEmail);
    const code = String(req.body?.code || "").trim();
    const password = req.body?.password;
    if (!user || !/^\d{6}$/.test(code) || !password || password.length < 8) return res.status(400).json({ success: false, message: "Enter a valid code and a password with at least 8 characters." });
    await verifyCode(user, "password_reset", code);

    if (user.password_hash) await updateUserPassword(user.id, await bcrypt.hash(password, 12));
    else await updateSupabaseAuthPassword(normalizedEmail, password);

    try { await recordLoginEvent(user, "password_reset_success"); }
    catch (eventError) { console.error("Password reset event recording failed:", eventError); }
    return res.json({ success: true });
  } catch (error) {
    console.error("Password reset error:", error);
    return res.status(401).json({ success: false, message: error.message || "Could not reset password." });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("convertflow_token", { sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", secure: process.env.NODE_ENV === "production" });
  res.json({ success: true });
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    return res.json({ success: true, user: { id: user.id, email: user.email, created_at: user.created_at } });
  } catch (error) {
    console.error("Current user error:", error);
    return res.status(500).json({ success: false, message: "Could not load account." });
  }
});

export default router;
