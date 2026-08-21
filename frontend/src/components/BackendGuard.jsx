import { useEffect, useState } from "react";
import { API_BASE_URL } from "../services/api";

function MaintenanceScreen() {
  return (
    <main className="maintenance-screen">
      <div className="maintenance-card">
        <div className="maintenance-icon" aria-hidden="true">⚙️</div>
        <p className="section-label">TEMPORARILY UNAVAILABLE</p>
        <h1>ConvertFlow is under maintenance</h1>
        <p>Our conversion server is not responding right now. Please wait a moment and try again.</p>
        <button className="auth-submit" onClick={() => window.location.reload()}>Try again</button>
      </div>
    </main>
  );
}

export default function BackendGuard({ children }) {
  const [ready, setReady] = useState(false);
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer;
    const started = Date.now();

    async function check() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/health`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!cancelled) {
          setReady(true);
          setMaintenance(false);
        }
      } catch (error) {
        if (Date.now() - started >= 30000 && !cancelled) {
          setMaintenance(true);
          setReady(false);
        }
      } finally {
        if (!cancelled) timer = setTimeout(check, 5000);
      }
    }

    check();
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  if (maintenance) return <MaintenanceScreen />;
  if (!ready) return <main className="maintenance-screen"><div className="maintenance-card"><div className="loading-spinner" /><p className="section-label">CONNECTING</p><h1>Starting ConvertFlow...</h1><p>We are checking the conversion server. This usually takes only a few seconds.</p></div></main>;
  return children;
}
