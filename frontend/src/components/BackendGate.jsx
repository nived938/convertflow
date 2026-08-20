import { useEffect, useState } from "react";
import { API_BASE_URL, checkBackendHealth } from "../services/api";

const MAX_WAIT_MS = 30_000;
const RETRY_MS = 3_000;

async function reportMaintenance(error) {
  try {
    await fetch(`${API_BASE_URL}/maintenance-alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error?.message || "Backend did not become ready within 30 seconds.",
        website: window.location.origin,
        occurredAt: new Date().toISOString(),
      }),
      keepalive: true,
    });
  } catch {
    // Keep the maintenance page available even if the notification endpoint is also unavailable.
  }
}

function MaintenanceScreen({ onRetry }) {
  return (
    <main className="backend-gate maintenance-screen">
      <div className="backend-gate-card">
        <span className="section-label">TEMPORARILY UNAVAILABLE</span>
        <h1>ConvertFlow is temporarily unavailable.</h1>
        <p>The conversion service did not respond within 30 seconds. Please try again in a moment.</p>
        <button className="auth-submit" onClick={onRetry}>Try again</button>
      </div>
    </main>
  );
}

export default function BackendGate({ children }) {
  const [ready, setReady] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let timeoutId;
    let retryId;
    let lastError;

    const check = async () => {
      try {
        await checkBackendHealth();
        if (active) { window.clearTimeout(timeoutId); setReady(true); }
      } catch (error) {
        lastError = error;
        if (active) retryId = window.setTimeout(check, RETRY_MS);
      }
    };

    check();
    timeoutId = window.setTimeout(() => {
      if (active) { setMaintenance(true); reportMaintenance(lastError); }
    }, MAX_WAIT_MS);

    return () => { active = false; window.clearTimeout(timeoutId); window.clearTimeout(retryId); };
  }, [attempt]);

  if (maintenance && !ready) return <MaintenanceScreen onRetry={() => { setReady(false); setMaintenance(false); setAttempt((value) => value + 1); }} />;
  if (!ready) return <main className="backend-gate"><div className="backend-gate-card"><div className="backend-spinner" /><h1>Starting ConvertFlow</h1><p>Connecting to the conversion service…</p></div></main>;
  return children;
}
