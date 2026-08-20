import jwt from "jsonwebtoken";

export function requireAuth(
  req,
  res,
  next
) 
{
  const token =
    req.cookies?.convertflow_token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message:
        "You must be logged in.",
    });
  }

  try {
    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    req.user = decoded;

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message:
        "Your session has expired.",
    });
  }
}

export function optionalAuth(
  req,
  res,
  next
) {
  const token =
    req.cookies?.convertflow_token;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    req.user = decoded;
  } catch {
    req.user = null;
  }

  next();
}