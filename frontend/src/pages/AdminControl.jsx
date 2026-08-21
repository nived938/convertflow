import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "https://convertflow-backend.onrender.com/api").replace(/\/$/, "");

async function control(body, token) {
  const response = await fetch(`${API_BASE_URL}/admin/control`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!response.ok || data.success === false) throw new Error(data.message || `Request failed with HTTP ${response.status}.`);
  return data;
}

function Toggle({ checked, onChange, disabled, title, description }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: 20, borderRadius: 16, border: "1px solid var(--border,#273244)", background: "rgba(255,255,255,.025)", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .55 : 1 }}>
      <span>
        <strong style={{ display: "block", fontSize: 16 }}>{title}</strong>
        <span style={{ display: "block", marginTop: 5, fontSize: 13, lineHeight: 1.5, opacity: .58 }}>{description}</span>
      </span>
      <span style={{ position: "relative", flex: "0 0 auto", width: 54, height: 30 }}>
        <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} />
        <span style={{ position: "absolute", inset: 0, borderRadius: 999, background: checked ? "#16a34a" : "#374151", transition: ".2s" }} />
        <span style={{ position: "absolute", top: 4, left: checked ? 28 : 4, width: 22, height: 22, borderRadius: "50%", background: "white", boxShadow: "0 2px 7px rgba(0,0,0,.3)", transition: ".2s" }} />
      </span>
    </label>
  );
}

export default function AdminControl() {
  const navigate = useNavigate();
  const [token] = useState(() => sessionStorage.getItem("convertflow_admin_token") || "");
  const [status, setStatus] = useState("unknown");
  const [siteMode, setSiteMode] = useState("normal");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const logout = useCallback(() => {
    sessionStorage.removeItem("convertflow_admin_token");
    navigate("/admin", { replace: true });
  }, [navigate]);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const [backend, mode] = await Promise.all([
        control({ action: "status" }, token),
        fetch(`${API_BASE_URL}/admin/site-mode`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }).then(async r => {
          const d = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(d.message || "Could not read site mode.");
          return d;
        }),
      ]);
      setStatus(backend.status || "unknown");
      setSiteMode(mode.mode || "normal");
      setMessage("");
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

  async function setBackend(enabled) {
    const action = enabled ? "on" : "off";
    if (!window.confirm(enabled ? "Resume the ConvertFlow backend and reconnect normal site operation?" : "Suspend the backend? Visitors will immediately receive the maintenance page.")) return;
    setBusy(true); setMessage("");
    try {
      const result = await control({ action }, token);
      setStatus(result.status || (enabled ? "resuming" : "suspending"));
      setSiteMode(result.siteMode || (enabled ? "normal" : "maintenance"));
      setMessage(result.message || "Backend control updated.");
    } catch (error) { setMessage(error.message); if (/unauthorized|invalid|expired/i.test(error.message)) logout(); }
    finally { setBusy(false); }
  }

  async function setMode(mode) {
    setBusy(true); setMessage("");
    try {
      const result = await control({ action: "site-mode", mode }, token);
      setSiteMode(result.mode);
      setMessage(mode === "normal" ? "Normal site mode enabled." : mode === "maintenance" ? "Maintenance page enabled for every public page." : "404 mode enabled for every public page.");
    } catch (error) { setMessage(error.message); if (/unauthorized|invalid|expired/i.test(error.message)) logout(); }
    finally { setBusy(false); }
  }

  const normalizedStatus = String(status).toLowerCase();
  const backendOn = ["running", "live", "active"].includes(normalizedStatus);

  return (
    <main style={{ minHeight: "100vh", padding: "34px 18px 60px", boxSizing: "border-box", background: "radial-gradient(circle at top,#172033 0,#080b12 42%,#05070b 100%)", color: "inherit" }}>
      <section style={{ width: "min(1040px,100%)", margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center", flexWrap: "wrap", marginBottom: 28 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: 2.5, fontWeight: 900, opacity: .5 }}>CONVERTFLOW / ADMIN</p>
            <h1 style={{ margin: "7px 0 5px", fontSize: "clamp(30px,5vw,48px)", letterSpacing: -1.5 }}>Control Center</h1>
            <p style={{ margin: 0, opacity: .55 }}>Manage backend availability and what every visitor sees.</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ padding: "8px 12px", borderRadius: 999, background: backendOn ? "rgba(34,197,94,.13)" : "rgba(239,68,68,.13)", color: backendOn ? "#4ade80" : "#f87171", fontSize: 12, fontWeight: 850 }}>{backendOn ? "BACKEND ONLINE" : "BACKEND OFFLINE"}</span>
            <button onClick={logout} style={{ padding: "9px 13px", borderRadius: 10, border: "1px solid var(--border,#273244)", background: "transparent", color: "inherit", cursor: "pointer" }}>Sign out</button>
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 18 }}>
          <section style={{ padding: 22, borderRadius: 22, border: "1px solid var(--border,#273244)", background: "rgba(17,24,39,.72)", backdropFilter: "blur(14px)" }}>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: 1.8, fontWeight: 850, opacity: .45 }}>SERVER</p>
            <h2 style={{ margin: "8px 0 6px" }}>Backend connection</h2>
            <p style={{ margin: "0 0 18px", fontSize: 13, lineHeight: 1.55, opacity: .55 }}>When OFF, ConvertFlow is put into maintenance mode before Render is suspended. The frontend stops calling the backend.</p>
            <Toggle checked={backendOn} disabled={busy} onChange={e => setBackend(e.target.checked)} title={backendOn ? "Backend ON" : "Backend OFF"} description={backendOn ? "Normal backend connections are allowed." : "Backend is suspended and public traffic is blocked by site mode."} />
            <button disabled={busy} onClick={refresh} style={{ width: "100%", marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid var(--border,#273244)", background: "transparent", color: "inherit", cursor: busy ? "not-allowed" : "pointer" }}>{busy ? "Working..." : "Refresh status"}</button>
          </section>

          <section style={{ padding: 22, borderRadius: 22, border: "1px solid var(--border,#273244)", background: "rgba(17,24,39,.72)", backdropFilter: "blur(14px)" }}>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: 1.8, fontWeight: 850, opacity: .45 }}>VISITOR EXPERIENCE</p>
            <h2 style={{ margin: "8px 0 6px" }}>Global page mode</h2>
            <p style={{ margin: "0 0 18px", fontSize: 13, lineHeight: 1.55, opacity: .55 }}>Exactly one of these modes can be active. Visitors first see the loading screen for 2 seconds, then the selected page on every public route.</p>
            <div style={{ display: "grid", gap: 10 }}>
              <Toggle checked={siteMode === "maintenance"} disabled={busy} onChange={e => setMode(e.target.checked ? "maintenance" : "normal")} title="Only show maintenance page" description="Every public URL shows the maintenance screen." />
              <Toggle checked={siteMode === "not_found"} disabled={busy} onChange={e => setMode(e.target.checked ? "not_found" : "normal")} title="Only show 404 page" description="Every public URL shows the 404 screen." />
            </div>
          </section>
        </div>

        <section style={{ marginTop: 18, padding: 22, borderRadius: 22, border: "1px solid var(--border,#273244)", background: "rgba(17,24,39,.72)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div><p style={{ margin: 0, fontSize: 11, letterSpacing: 1.8, fontWeight: 850, opacity: .45 }}>CURRENT STATE</p><h2 style={{ margin: "8px 0 0" }}>{siteMode === "normal" ? "Normal site" : siteMode === "maintenance" ? "Maintenance page" : "404 page"}</h2></div>
            <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(148,163,184,.08)", fontSize: 13, opacity: .75 }}>Backend: {normalizedStatus}</div>
          </div>
          {message && <p role="status" style={{ margin: "18px 0 0", padding: 14, borderRadius: 12, background: "rgba(148,163,184,.08)" }}>{message}</p>}
        </section>
      </section>
    </main>
  );
}
