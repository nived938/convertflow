import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "https://convertflow-backend.onrender.com/api").replace(/\/$/, "");

async function control(action, token) {
  const response = await fetch(`${API_BASE_URL}/admin/control`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action }),
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!response.ok || data.success === false) throw new Error(data.message || `Control request failed with HTTP ${response.status}.`);
  return data;
}

export default function AdminControl() {
  const navigate = useNavigate();
  const [token] = useState(() => sessionStorage.getItem("convertflow_admin_token") || "");
  const [status, setStatus] = useState("unknown");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const logout = useCallback(() => {
    sessionStorage.removeItem("convertflow_admin_token");
    navigate("/admin", { replace: true });
  }, [navigate]);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const result = await control("status", token);
      setStatus(result.status || "unknown");
      setMessage(result.message || "Status updated.");
    } catch (error) {
      setMessage(error.message);
      if (/unauthorized|invalid|expired/i.test(error.message)) logout();
    }
  }, [token, logout]);

  useEffect(() => {
    if (!token) { navigate("/admin", { replace: true }); return undefined; }
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, [token, navigate, refresh]);

  async function changeService(action) {
    const label = action === "on" ? "start" : "stop";
    if (!window.confirm(`Are you sure you want to ${label} the ConvertFlow backend?`)) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await control(action, token);
      setStatus(result.status || (action === "on" ? "resuming" : "suspending"));
      setMessage(result.message || `Backend ${label} request sent.`);
    } catch (error) {
      setMessage(error.message);
      if (/unauthorized|invalid|expired/i.test(error.message)) logout();
    } finally { setBusy(false); }
  }

  const normalizedStatus = String(status).toLowerCase();
  const isOnline = ["running", "live", "active"].includes(normalizedStatus);
  const isOffline = ["suspended", "offline"].includes(normalizedStatus);

  return (
    <main style={{ minHeight: "100vh", padding: "48px 20px", display: "grid", placeItems: "center", boxSizing: "border-box" }}>
      <section style={{ width: "min(760px, 100%)", boxSizing: "border-box", padding: 28, borderRadius: 20, border: "1px solid var(--border, #273244)", background: "var(--card-bg, #111827)", boxShadow: "0 20px 60px rgba(0,0,0,.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, letterSpacing: 1.5, fontWeight: 700, opacity: .65 }}>CONVERTFLOW ADMIN</p>
            <h1 style={{ margin: "8px 0" }}>Backend Control</h1>
            <p style={{ margin: 0, opacity: .72 }}>Protected by the ConvertFlow Node.js backend. Render credentials never reach this page.</p>
          </div>
          <div style={{ padding: "8px 13px", borderRadius: 999, background: isOnline ? "rgba(34,197,94,.14)" : isOffline ? "rgba(239,68,68,.14)" : "rgba(148,163,184,.14)", color: isOnline ? "#22c55e" : isOffline ? "#ef4444" : "#94a3b8", fontWeight: 700 }}>{normalizedStatus.toUpperCase()}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 28 }}>
          <button type="button" disabled={busy} onClick={() => changeService("on")} style={{ padding: 15, border: 0, borderRadius: 12, background: "#16a34a", color: "white", fontWeight: 750, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? .6 : 1 }}>Turn Backend ON</button>
          <button type="button" disabled={busy} onClick={() => changeService("off")} style={{ padding: 15, border: 0, borderRadius: 12, background: "#dc2626", color: "white", fontWeight: 750, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? .6 : 1 }}>Turn Backend OFF</button>
          <button type="button" disabled={busy} onClick={refresh} style={{ padding: 15, borderRadius: 12, border: "1px solid var(--border, #273244)", background: "transparent", color: "inherit", fontWeight: 700, cursor: busy ? "not-allowed" : "pointer" }}>{busy ? "Working..." : "Refresh Status"}</button>
        </div>
        {message && <p role="status" style={{ margin: "20px 0 0", padding: 14, borderRadius: 10, background: "rgba(148,163,184,.1)" }}>{message}</p>}
        <button type="button" onClick={logout} style={{ marginTop: 22, padding: "10px 14px", borderRadius: 9, border: "1px solid var(--border, #273244)", background: "transparent", color: "inherit", cursor: "pointer" }}>Sign out</button>
      </section>
    </main>
  );
}
