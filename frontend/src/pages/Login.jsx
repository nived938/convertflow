import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  login,
  verifyLoginCode,
} from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();

  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [verificationEmail, setVerificationEmail] = useState(
    location.state?.email || ""
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const awaitingCode = Boolean(verificationEmail);

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      const result = await login(email.trim(), password);

      if (result.requiresVerification) {
        setVerificationEmail(result.email);
        setPassword("");
      }
    } catch (loginError) {
      console.error("Login error:", loginError);
      setError(loginError.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeSubmit(event) {
    event.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the six-digit code from your email.");
      return;
    }

    try {
      setLoading(true);
      await verifyLoginCode(verificationEmail, code.trim());
      await refreshUser();
      navigate("/dashboard");
    } catch (verificationError) {
      console.error("Login verification error:", verificationError);
      setError(verificationError.message || "Could not verify your code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">ConvertFlow</div>
          <h1>{awaitingCode ? "Check your email" : "Welcome back"}</h1>
          <p>
            {awaitingCode
              ? `We sent a six-digit security code to ${verificationEmail}.`
              : "Sign in to access your ConvertFlow account."}
          </p>
        </div>

        {awaitingCode ? (
          <form className="auth-form" onSubmit={handleCodeSubmit}>
            {error && <div className="auth-error">{error}</div>}

            <div className="auth-field">
              <label htmlFor="verification-code">Email code</label>
              <input
                id="verification-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                autoComplete="one-time-code"
                disabled={loading}
                autoFocus
                required
              />
              <span className="password-hint">The code expires in 10 minutes.</span>
            </div>

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify and sign in"}
            </button>

            <button
              className="forgot-password"
              type="button"
              onClick={() => {
                setVerificationEmail("");
                setCode("");
                setError("");
              }}
              disabled={loading}
            >
              Use a different account
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handlePasswordSubmit}>
            {error && <div className="auth-error">{error}</div>}

            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
                required
              />
            </div>

            <div className="auth-field">
              <div className="auth-label-row">
                <label htmlFor="password">Password</label>
                <button
                  type="button"
                  className="forgot-password"
                  onClick={() => navigate("/forgot-password")}
                >
                  Forgot password?
                </button>
              </div>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
                required
              />
            </div>

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Sending code..." : "Continue"}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <span>Don't have an account?</span>
          <Link to="/register">Create an account</Link>
        </div>
      </div>
    </main>
  );
}
