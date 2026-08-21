import { useCallback, useEffect, useState } from "react";

const CONTROL_URL = (import.meta.env.VITE_ADMIN_CONTROL_WEBHOOK_URL || "").replace(/\/$/, "");

const cardStyle = {
  width: "min(760px, 100%)",
  boxSizing: "border-box",
  background: "var(--card-bg, #111827)",
  border: "1px solid var(--border, #273244)",
  borderRadius: 20,
  padding: 28,
  boxShadow: "0 20px 60px rgba(0,0,0,.18)",
};

async function control(action, password) {
  if (!CONTROL_URL) throw new Error("Admin control webhook is not configured.");
  const body = new URLSearchParams({ action, password });
  const response = await fetch(CONTROL_URL, { method: "POST", body });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!response.ok || data.success === false) throw new Error(data.message || `Control request failed with HTTP ${response.status}.`);
  return data;
}

export default function AdminControl() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("unknown");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const refresh = useCallback(async () => {
    if (!password) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await control("status", password);
      setStatus(result.status || "unknown");
      setMessage(result.message || "Status updated.");
    } catch (error) {
      setStatus("unknown");
      setMessage(error.message);
    } finally { setBusy(false); }
  }, [password]);

  useEffect(() => {
    if (!password) return undefined;
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, [password, refresh]);

  async function changeService(action) {
    const label = action === "on" ? "start" : "stop";
    if (!password) { setMessage("Enter the admin password first."); return; }
    if (!window.confirm(`Are you sure you want to ${label} the ConvertFlow backend?`)) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await control(action, password);
      setStatus(result.status || (action === "on" ? "resuming" : "suspending"));
      setMessage(result.message || `Backend ${label} request sent.`);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  const isOnline = ["running", "live", "active"].includes(String(status).toLowerCase());
  const isOffline = ["suspended", "offline"].includes(String(status).toLowerCase());

  return (
    <main style={{ minHeight: "100vh", padding: "48px 20px", display: "grid", placeItems: "center", boxSizing: "border-box" }}>
      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, letterSpacing: 1.5, fontWeight: 700, opacity: .65 }}>CONVERTFLOW ADMIN</p>
            <h1 style={{ margin: "8px 0", fontSize: "clamp(28px, 5vw, 42px)" }}>Backend Control</h1>
            <p style={{ margin: 0, opacity: .72 }}>Control the Render backend without exposing your Render API key to the browser.</p>
          </div>
          <div style={{ padding: "8px 13px", borderRadius: 999, background: isOnline ? "rgba(34,197,94,.14)" : isOffline ? "rgba(239,68,68,.14)" : "rgba(148,163,184,.14)", color: isOnline ? "#22c55e" : isOffline ? "#ef4444" : "#94a3b8", fontWeight: 700 }}>{String(status).toUpperCase()}</div>
        </div>

        <div style={{ marginTop: 28, display: "grid", gap: 14 }}>
          <label style={{ fontWeight: 650 }}>Admin password</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") refresh(); }} placeholder="Enter your control password" autoComplete="current-password" style={{ flex: 1, minWidth: 0, padding: "13px 14px", borderRadius: 10, border: "1px solid var(--border, #273244)", background: "transparent", color: "inherit", fontSize: 16 }} />
            <button type="button" onClick={() => setShowPassword((value) => !value)} style={{ padding: "0 14px", borderRadius: 10, border: "1px solid var(--border, #273244)", background: "transparent", color: "inherit", cursor: "pointer" }}>{showPassword ? "Hide" : "Show"}</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 8 }}>
            <button type="button" disabled={busy || !password} onClick={() => changeService("on")} style={{ padding: 15, border: 0, borderRadius: 12, background: "#16a34a", color: "white", fontWeight: 750, cursor: busy || !password ? "not-allowed" : "pointer", opacity: busy || !password ? .55 : 1 }}>Turn Backend ON</button>
            <button type="button" disabled={busy || !password} onClick={() => changeService("off")} style={{ padding: 15, border: 0, borderRadius: 12, background: "#dc2626", color: "white", fontWeight: 750, cursor: busy || !password ? "not-allowed" : "pointer", opacity: busy || !password ? .55 : 1 }}>Turn Backend OFF</button>
            <button type="button" disabled={busy || !password} onClick={refresh} style={{ padding: 15, borderRadius: 12, border: "1px solid var(--border, #273244)", background: "transparent", color: "inherit", fontWeight: 700, cursor: busy || !password ? "not-allowed" : "pointer", opacity: busy || !password ? .55 : 1 }}>{busy ? "Working..." : "Refresh Status"}</button>
          </div>
        </div>

        {message && <p role="status" style={{ margin: "20px 0 0", padding: 14, borderRadius: 10, background: "rgba(148,163,184,.1)" }}>{message}</p>}

        <div style={{ marginTop: 28, paddingTop: 22, borderTop: "1px solid var(--border, #273244)", fontSize: 13, opacity: .65, lineHeight: 1.6 }}>
          <strong>Important:</strong> the ON/OFF request is handled by n8n, which calls the Render API. The Render API key is never sent to this page.
        </div>
      </section>
    </main>
  );
}
