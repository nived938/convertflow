import express from "express";
import crypto from "crypto";

const router = express.Router();
const TOKEN_TTL_SECONDS = 30 * 60;

function getSecret() {
  return process.env.ADMIN_CONTROL_SECRET || "";
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function signToken(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyAdminToken(token) {
  try {
    if (!getSecret() || !token) return false;
    const [encoded, signature] = String(token).split(".");
    if (!encoded || !signature) return false;
    const expected = crypto.createHmac("sha256", getSecret()).update(encoded).digest("base64url");
    if (!safeEqual(signature, expected)) return false;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return payload.role === "admin" && Number(payload.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

router.post("/login", (req, res) => {
  const password = String(req.body?.password || "");
  const expectedPassword = String(process.env.ADMIN_PASSWORD || "");
  const secret = getSecret();

  if (!expectedPassword || !secret) {
    return res.status(503).json({ success: false, message: "Admin authentication is not configured." });
  }

  if (!safeEqual(password, expectedPassword)) {
    return res.status(401).json({ success: false, message: "Invalid admin password." });
  }

  const now = Math.floor(Date.now() / 1000);
  const token = signToken({ role: "admin", iat: now, exp: now + TOKEN_TTL_SECONDS });
  return res.json({ success: true, token, expiresIn: TOKEN_TTL_SECONDS });
});

router.get("/session", (req, res) => {
  const authorization = String(req.headers.authorization || "");
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  return res.json({ success: verifyAdminToken(token) });
});

export default router;
