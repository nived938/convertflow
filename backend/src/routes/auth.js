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
}
function verificationUnavailable(res) {
  return res.status(503).json({ success: false, message: "Email verification is not configured yet. Please try again later." });
}

async function sendEmailCode(user, type) {
  const code = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + getCodeTtlMinutes() * 60000).toISOString();
  const response = await fetch(process.env.N8N_LOGIN_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-convertflow-secret": process.env.N8N_WEBHOOK_SECRET },
    body: JSON.stringify({ type, email: user.email, code, expiresInMinutes: getCodeTtlMinutes(), expiresAt }),
  });
  if (!response.ok) throw new Error(`n8n responded with ${response.status}`);
  return { codeHash: hashCode(code), expiresAt };
}

async function createVerification(user, type) {
  const { codeHash, expiresAt } = await sendEmailCode(user, type);
  const { supabaseVerification } = await import("../services/supabaseVerification.js");
  await supabaseVerification.upsert({ userId: user.id, type, codeHash, expiresAt, attempts: 0 });
}

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required." });
    if (password.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
    if (!configReady()) return verificationUnavailable(res);
    const normalizedEmail = normalizeEmail(email);
    if (await findUserByEmail(normalizedEmail)) return res.status(409).json({ success: false, message: "An account with this email already exists." });
    const user = await createUser(normalizedEmail, await bcrypt.hash(password, 12));
    try {
      await createVerification(user, "login_code");
      await recordLoginEvent(user, "registration_verification_requested");
    } catch (error) {
      console.error("Registration verification email error:", error);
      return res.status(503).json({ success: false, message: "We could not send your verification code. Please try again." });
    }
    return res.status(201).json({ success: true, requiresVerification: true, email: user.email });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ success: false, message: "Could not create account." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const user = await findUserByEmail(normalizeEmail(req.body.email));
    if (!user || !req.body.password || !(await bcrypt.compare(req.body.password, user.password_hash))) return res.status(401).json({ success: false, message: "Invalid email or password." });
    if (!configReady()) return verificationUnavailable(res);
    try {
      await createVerification(user, "login_code");
      await recordLoginEvent(user, "login_verification_requested");
    } catch (error) {
      console.error("Login verification email error:", error);
      return res.status(503).json({ success: false, message: "We could not send your verification code. Please try again." });
    }
    return res.json({ success: true, requiresVerification: true, email: user.email });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Could not sign in." });
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
    const user = await findUserByEmail(normalizeEmail(req.body.email));
    const code = String(req.body.code || "").trim();
    if (!user || !/^\d{6}$/.test(code)) return res.status(400).json({ success: false, message: "Enter the six-digit code from your email." });
    await verifyCode(user, "login_code", code);
    setSessionCookie(res, user);
    await recordLoginEvent(user, "login_success");
    return res.json({ success: true, user: { id: user.id, email: user.email } });
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message || "Could not verify your code." });
  }
});

router.post("/request-password-reset", async (req, res) => {
  try {
    const user = await findUserByEmail(normalizeEmail(req.body.email));
    if (!user) return res.json({ success: true });
    if (!configReady()) return verificationUnavailable(res);
    await createVerification(user, "password_reset");
    await recordLoginEvent(user, "password_reset_requested");
    return res.json({ success: true });
  } catch (error) {
    console.error("Password reset request error:", error);
    return res.status(503).json({ success: false, message: "We could not send your reset code. Please try again." });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const user = await findUserByEmail(normalizeEmail(req.body.email));
    const code = String(req.body.code || "").trim();
    const password = req.body.password;
    if (!user || !/^\d{6}$/.test(code) || !password || password.length < 8) return res.status(400).json({ success: false, message: "Enter a valid code and a password with at least 8 characters." });
    await verifyCode(user, "password_reset", code);
    await updateUserPassword(user.id, await bcrypt.hash(password, 12));
    await recordLoginEvent(user, "password_reset_success");
    return res.json({ success: true });
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message || "Could not reset password." });
  }
});

router.post("/logout", (req, res) => { res.clearCookie("convertflow_token", { sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", secure: process.env.NODE_ENV === "production" }); res.json({ success: true }); });
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    return res.json({ success: true, user: { id: user.id, email: user.email, created_at: user.created_at } });
  } catch (error) { return res.status(500).json({ success: false, message: "Could not load account." }); }
});

export default router;
