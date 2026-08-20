import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  requestPasswordReset,
  resetPassword,
} from "../services/api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requested, setRequested] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestCode(event) {
    event.preventDefault();
    setError("");
    try {
      setLoading(true);
      await requestPasswordReset(email.trim());
      setRequested(true);
      setMessage("If that email has an account, a reset code has been sent.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    try {
      setLoading(true);
      await resetPassword(email.trim(), code, password);
      navigate("/login", { state: { email: email.trim() } });
    } catch (resetError) {
      setError(resetError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">ConvertFlow</div>
          <h1>{requested ? "Set a new password" : "Reset your password"}</h1>
          <p>{requested ? "Enter the code sent to your email and choose a new password." : "We will send a six-digit reset code to your email."}</p>
        </div>
        <form className="auth-form" onSubmit={requested ? savePassword : requestCode}>
          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-success">{message}</div>}
          <div className="auth-field">
            <label htmlFor="reset-email">Email</label>
            <input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading || requested} required />
          </div>
          {requested && <>
            <div className="auth-field">
              <label htmlFor="reset-code">Reset code</label>
              <input id="reset-code" inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" autoComplete="one-time-code" disabled={loading} required />
            </div>
            <div className="auth-field">
              <label htmlFor="new-password">New password</label>
              <input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" disabled={loading} required />
            </div>
            <div className="auth-field">
              <label htmlFor="confirm-new-password">Confirm new password</label>
              <input id="confirm-new-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" disabled={loading} required />
            </div>
          </>}
          <button className="auth-submit" type="submit" disabled={loading}>{loading ? "Please wait..." : requested ? "Save new password" : "Send reset code"}</button>
        </form>
        <div className="auth-footer"><Link to="/login">Back to sign in</Link></div>
      </div>
    </main>
  );
}
