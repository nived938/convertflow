import jwt from "jsonwebtoken";

function getToken(req) {
  const cookieToken = req.cookies?.convertflow_token;
  if (cookieToken) return cookieToken;

  const authorization = req.headers.authorization || "";
  if (authorization.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();
  return null;
}

export function requireAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ success: false, message: "You must be logged in." });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Your session has expired." });
  }
}

export function optionalAuth(req, res, next) {
  const token = getToken(req);
  if (!token) {
    req.user = null;
    return next();
  }
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); }
  catch { req.user = null; }
  next();
}
