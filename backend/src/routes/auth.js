import crypto from "crypto";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { db } from "../../database/database.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserPassword,
} from "../models/userModel.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
const MAX_CODE_ATTEMPTS = 5;

function normalizeEmail(email) {
  return email?.trim().toLowerCase();
}

function getCodeTtlMinutes() {
  const configured = Number(process.env.LOGIN_CODE_TTL_MINUTES || 10);

  return Number.isFinite(configured)
    ? Math.min(Math.max(configured, 5), 30)
    : 10;
}

function hashCode(code) {
  return crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(code)
    .digest("hex");
}

function setSessionCookie(res, user) {
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d",
    }
  );

  res.cookie("convertflow_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function validateN8nConfiguration() {
  const webhookUrl = process.env.N8N_LOGIN_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

  return Boolean(
    webhookUrl &&
      webhookSecret &&
      !webhookSecret.startsWith("REPLACE_")
  );
}

async function sendEmailCode(user, type) {
  const table = type === "password_reset"
    ? "password_reset_codes"
    : "login_codes";
  const code = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(
    Date.now() + getCodeTtlMinutes() * 60 * 1000
  ).toISOString();

  db.prepare(`
    INSERT INTO ${table} (
      user_id,
      code_hash,
      expires_at,
      attempts,
      created_at
    )
    VALUES (?, ?, ?, 0, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      code_hash = excluded.code_hash,
      expires_at = excluded.expires_at,
      attempts = 0,
      created_at = excluded.created_at
  `).run(
    user.id,
    hashCode(code),
    expiresAt,
    new Date().toISOString()
  );

  try {
    const response = await fetch(process.env.N8N_LOGIN_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-convertflow-secret": process.env.N8N_WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        type,
        email: user.email,
        code,
        expiresInMinutes: getCodeTtlMinutes(),
      }),
    });

    if (!response.ok) {
      throw new Error(`n8n responded with ${response.status}`);
    }
  } catch (error) {
    db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(user.id);
    throw error;
  }
}

function verificationUnavailable(res) {
  return res.status(503).json({
    success: false,
    message: "Email verification is not configured yet. Please try again later.",
  });
}

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    if (!validateN8nConfiguration()) {
      return verificationUnavailable(res);
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = findUserByEmail(normalizedEmail);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = createUser(normalizedEmail, passwordHash);

    try {
      await sendEmailCode(user, "login_code");
    } catch (error) {
      console.error("Registration verification email error:", error);

      return res.status(503).json({
        success: false,
        message: "We could not send your verification code. Please try signing in again.",
      });
    }

    return res.status(201).json({
      success: true,
      requiresVerification: true,
      email: user.email,
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not create account.",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const user = findUserByEmail(normalizedEmail);

    if (!user || !password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!validateN8nConfiguration()) {
      return verificationUnavailable(res);
    }

    try {
      await sendEmailCode(user, "login_code");
    } catch (error) {
      console.error("Login verification email error:", error);

      return res.status(503).json({
        success: false,
        message: "We could not send your verification code. Please try again.",
      });
    }

    return res.json({
      success: true,
      requiresVerification: true,
      email: user.email,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not sign in.",
    });
  }
});

router.post("/verify-login", (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").trim();
    const user = findUserByEmail(normalizedEmail);

    if (!user || !/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: "Enter the six-digit code from your email.",
      });
    }

    const record = db.prepare(`
      SELECT code_hash, expires_at, attempts
      FROM login_codes
      WHERE user_id = ?
    `).get(user.id);

    if (!record || new Date(record.expires_at) <= new Date()) {
      db.prepare("DELETE FROM login_codes WHERE user_id = ?").run(user.id);

      return res.status(401).json({
        success: false,
        message: "That code has expired. Sign in again to request a new one.",
      });
    }

    const expected = Buffer.from(record.code_hash, "hex");
    const received = Buffer.from(hashCode(code), "hex");
    const matches = crypto.timingSafeEqual(expected, received);

    if (!matches) {
      const attempts = record.attempts + 1;

      if (attempts >= MAX_CODE_ATTEMPTS) {
        db.prepare("DELETE FROM login_codes WHERE user_id = ?").run(user.id);
      } else {
        db.prepare(`
          UPDATE login_codes
          SET attempts = ?
          WHERE user_id = ?
        `).run(attempts, user.id);
      }

      return res.status(401).json({
        success: false,
        message: "That verification code is not valid.",
      });
    }

    db.prepare("DELETE FROM login_codes WHERE user_id = ?").run(user.id);
    setSessionCookie(res, user);

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not verify your code.",
    });
  }
});

router.post("/request-password-reset", async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    const user = findUserByEmail(normalizedEmail);

    // This response is intentionally identical for unknown emails.
    if (!user) {
      return res.json({ success: true });
    }

    if (!validateN8nConfiguration()) {
      return verificationUnavailable(res);
    }

    try {
      await sendEmailCode(user, "password_reset");
    } catch (error) {
      console.error("Password reset email error:", error);

      return res.status(503).json({
        success: false,
        message: "We could not send your reset code. Please try again.",
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Password reset request error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not start password reset.",
    });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").trim();
    const password = req.body.password;
    const user = findUserByEmail(normalizedEmail);

    if (!user || !/^\d{6}$/.test(code) || !password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid code and a password with at least 8 characters.",
      });
    }

    const record = db.prepare(`
      SELECT code_hash, expires_at, attempts
      FROM password_reset_codes
      WHERE user_id = ?
    `).get(user.id);

    if (!record || new Date(record.expires_at) <= new Date()) {
      db.prepare("DELETE FROM password_reset_codes WHERE user_id = ?").run(user.id);

      return res.status(401).json({
        success: false,
        message: "That reset code has expired. Request a new one.",
      });
    }

    const matches = crypto.timingSafeEqual(
      Buffer.from(record.code_hash, "hex"),
      Buffer.from(hashCode(code), "hex")
    );

    if (!matches) {
      const attempts = record.attempts + 1;

      if (attempts >= MAX_CODE_ATTEMPTS) {
        db.prepare("DELETE FROM password_reset_codes WHERE user_id = ?").run(user.id);
      } else {
        db.prepare(`
          UPDATE password_reset_codes
          SET attempts = ?
          WHERE user_id = ?
        `).run(attempts, user.id);
      }

      return res.status(401).json({
        success: false,
        message: "That reset code is not valid.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    updateUserPassword(user.id, passwordHash);
    db.prepare("DELETE FROM password_reset_codes WHERE user_id = ?").run(user.id);

    return res.json({ success: true });
  } catch (error) {
    console.error("Password reset error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not reset password.",
    });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("convertflow_token");
  res.json({ success: true });
});

router.get("/me", requireAuth, (req, res) => {
  const user = findUserById(req.user.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found.",
    });
  }

  return res.json({ success: true, user });
});

export default router;
