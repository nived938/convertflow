import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "https://convertflow-backend.onrender.com/api").replace(/\/$/, "");

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function login(event) {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.token) throw new Error(data.message || "Unable to sign in.");
      sessionStorage.setItem("convertflow_admin_token", data.token);
      navigate("/admin/control", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, boxSizing: "border-box" }}>
      <form onSubmit={login} style={{ width: "min(430px, 100%)", padding: 30, borderRadius: 20, border: "1px solid var(--border, #273244)", background: "var(--card-bg, #111827)", boxShadow: "0 20px 60px rgba(0,0,0,.18)" }}>
        <p style={{ margin: 0, fontSize: 12, letterSpacing: 1.5, fontWeight: 700, opacity: .65 }}>CONVERTFLOW ADMIN</p>
        <h1 style={{ margin: "8px 0 10px" }}>Admin sign in</h1>
        <p style={{ opacity: .7, lineHeight: 1.5 }}>Sign in here first. Backend controls are on a separate protected page.</p>
        <label htmlFor="admin-password" style={{ display: "block", marginTop: 22, marginBottom: 8, fontWeight: 650 }}>Admin password</label>
        <input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" autoFocus required style={{ width: "100%", boxSizing: "border-box", padding: "14px", borderRadius: 10, border: "1px solid var(--border, #273244)", background: "transparent", color: "inherit", fontSize: 16 }} />
        <button type="submit" disabled={busy || !password} style={{ width: "100%", marginTop: 14, padding: 14, border: 0, borderRadius: 10, background: "#2563eb", color: "white", fontWeight: 750, cursor: busy || !password ? "not-allowed" : "pointer", opacity: busy || !password ? .6 : 1 }}>{busy ? "Signing in..." : "Continue to controls"}</button>
        {error && <p role="alert" style={{ margin: "16px 0 0", color: "#ef4444" }}>{error}</p>}
      </form>
    </main>
  );
}
