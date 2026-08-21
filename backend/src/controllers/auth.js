import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "../config/supabase.js";

const CODE_TTL_MINUTES = Number(process.env.LOGIN_CODE_TTL_MINUTES || 10);

function generateCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

async function sendAuthEmail({ type, email, code }) {
  const webhookUrl = process.env.N8N_LOGIN_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

  if (!webhookUrl) throw new Error("N8N_LOGIN_WEBHOOK_URL is not configured.");
  if (!webhookSecret) throw new Error("N8N_WEBHOOK_SECRET is not configured.");

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-convertflow-secret": webhookSecret
    },
    body: JSON.stringify({ type, email, code, expiresInMinutes: CODE_TTL_MINUTES })
  });

  const responseText = await response.text().catch(() => "");

  if (!response.ok) {
    console.error("n8n authentication email failed", {
      status: response.status,
      response: responseText
    });
    throw new Error(`Authentication email service returned HTTP ${response.status}.`);
  }

  // n8n can legitimately return an empty body after the workflow completes.
  // Do not call response.json(), because that throws on an empty response.
  if (!responseText.trim()) return { success: true };

  try {
    return JSON.parse(responseText);
  } catch {
    return { success: true, response: responseText };
  }
}

function createToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

export async function register(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required." });
    const normalizedEmail = email.trim().toLowerCase();
    if (password.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });

    const { data: existingUser, error: lookupError } = await supabaseAdmin.from("users").select("id,email").eq("email", normalizedEmail).maybeSingle();
    if (lookupError) throw lookupError;
    if (existingUser) return res.status(409).json({ success: false, message: "An account with this email already exists." });

    const passwordHash = await bcrypt.hash(password, 12);
    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

    const { data: user, error: insertError } = await supabaseAdmin.from("users").insert({ email: normalizedEmail, password_hash: passwordHash, email_verified: false, verification_code: code, verification_expires_at: expiresAt }).select("id,email,email_verified,created_at").single();
    if (insertError) throw insertError;

    try {
      await sendAuthEmail({ type: "verification_code", email: normalizedEmail, code });
    } catch (emailError) {
      await supabaseAdmin.from("users").delete().eq("id", user.id);
      console.error("Registration email failed:", emailError);
      return res.status(503).json({ success: false, message: "We could not send your verification code. Please try again later." });
    }

    return res.status(201).json({ success: true, message: "Account created. Check your email for the verification code.", user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ success: false, message: "Could not create your account." });
  }
}

export async function verifyEmail(req, res) {
  try {
    const { email, code } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const { data: user, error } = await supabaseAdmin.from("users").select("id,email,email_verified,verification_code,verification_expires_at").eq("email", normalizedEmail).maybeSingle();
    if (error) throw error;
    if (!user || user.verification_code !== String(code || "")) return res.status(400).json({ success: false, message: "Invalid verification code." });
    if (!user.verification_expires_at || new Date(user.verification_expires_at) < new Date()) return res.status(400).json({ success: false, message: "Verification code has expired." });

    const { data: updatedUser, error: updateError } = await supabaseAdmin.from("users").update({ email_verified: true, verification_code: null, verification_expires_at: null }).eq("id", user.id).select("id,email,email_verified").single();
    if (updateError) throw updateError;
    return res.json({ success: true, message: "Email verified successfully.", token: createToken(updatedUser), user: updatedUser });
  } catch (error) {
    console.error("Email verification error:", error);
    return res.status(500).json({ success: false, message: "Could not verify your email." });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const { data: user, error } = await supabaseAdmin.from("users").select("*").eq("email", normalizedEmail).maybeSingle();
    if (error) throw error;
    if (!user || !(await bcrypt.compare(password || "", user.password_hash))) return res.status(401).json({ success: false, message: "Invalid email or password." });

    if (!user.email_verified) {
      const code = generateCode();
      const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();
      const { error: updateError } = await supabaseAdmin.from("users").update({ verification_code: code, verification_expires_at: expiresAt }).eq("id", user.id);
      if (updateError) throw updateError;
      await sendAuthEmail({ type: "login_code", email: normalizedEmail, code });
      return res.status(200).json({ success: true, requiresVerification: true, message: "Check your email for the login verification code." });
    }

    return res.json({ success: true, token: createToken(user), user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Could not sign in." });
  }
}

export async function requestPasswordReset(req, res) {
  try {
    const normalizedEmail = String(req.body.email || "").trim().toLowerCase();
    if (!normalizedEmail) return res.status(400).json({ success: false, message: "Email is required." });

    const { data: user, error } = await supabaseAdmin.from("users").select("id,email").eq("email", normalizedEmail).maybeSingle();
    if (error) throw error;

    if (!user) return res.json({ success: true, message: "If an account exists for this email, a reset code has been sent." });

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();
    const { error: updateError } = await supabaseAdmin.from("users").update({ reset_code: code, reset_expires_at: expiresAt }).eq("id", user.id);
    if (updateError) throw updateError;

    await sendAuthEmail({ type: "password_reset", email: normalizedEmail, code });
    return res.json({ success: true, message: "If an account exists for this email, a reset code has been sent." });
  } catch (error) {
    console.error("Password reset request error:", error);
    return res.status(503).json({ success: false, message: "We could not send the password reset email. Please try again later." });
  }
}
