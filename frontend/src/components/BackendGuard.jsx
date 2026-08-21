import { useEffect, useState } from "react";
import { API_BASE_URL } from "../services/api";
import NotFound from "../pages/NotFound";

function MaintenanceScreen() {
  return <main className="maintenance-screen"><div className="maintenance-card"><div className="maintenance-icon" aria-hidden="true">⚙️</div><p className="section-label">BACKEND ACCESS DISABLED</p><h1>ConvertFlow is temporarily unavailable</h1><p>The administrator has disabled frontend access to the conversion server. Please try again later.</p><button className="auth-submit" onClick={() => window.location.reload()}>Check again</button></div></main>;
}

export default function BackendGuard({ children }) {
  const [ready, setReady] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [notFoundMode, setNotFoundMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer;
    async function check() {
      try {
        const control = await fetch("/api/site-mode", { cache: "no-store" });
        const state = await control.json().catch(() => ({}));
        if (state.success) {
          if (state.mode === "not_found") {
            if (!cancelled) { setNotFoundMode(true); setMaintenance(false); setReady(true); }
            timer = setTimeout(check, 5000);
            return;
          }
          if (state.mode === "maintenance" || state.backendEnabled === false) {
            if (!cancelled) { setMaintenance(true); setNotFoundMode(false); setReady(false); }
            timer = setTimeout(check, 5000);
            return;
          }
        }
        const response = await fetch(`${API_BASE_URL}/health`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!cancelled) { setReady(true); setMaintenance(false); setNotFoundMode(false); }
      } catch {
        if (!cancelled) { setMaintenance(false); setNotFoundMode(false); setReady(false); }
      } finally {
        if (!cancelled && !timer) timer = setTimeout(check, 5000);
      }
    }
    check();
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  if (maintenance) return <MaintenanceScreen />;
  if (!ready) return <main className="maintenance-screen"><div className="maintenance-card"><div className="loading-spinner" /><p className="section-label">CONNECTING</p><h1>Starting ConvertFlow...</h1><p>We are checking the conversion server. This usually takes only a few seconds.</p></div></main>;
  if (notFoundMode) return <NotFound />;
  return children;
}
