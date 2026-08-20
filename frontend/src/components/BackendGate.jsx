import {
  useEffect,
  useState,
} from "react";

import { checkBackendHealth } from "../services/api";

const MAX_WAIT_MS = 30_000;
const RETRY_MS = 3_000;

async function reportMaintenance(error) {
  const webhookUrl = import.meta.env.VITE_N8N_MAINTENANCE_WEBHOOK_URL;

  if (!webhookUrl) {
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "maintenance_alert",
        message: error?.message || "Backend did not become ready within 30 seconds.",
        website: window.location.origin,
        occurredAt: new Date().toISOString(),
      }),
    });
  } catch {
    // The customer-facing maintenance screen remains available even if the alert fails.
  }
}

function MaintenanceScreen({ onRetry }) {
  return (
    <main className="backend-gate maintenance-screen">
      <div className="backend-gate-card">
        <span className="section-label">TEMPORARILY UNAVAILABLE</span>
        <h1>ConvertFlow is waking up.</h1>
        <p>
          The conversion service did not respond in time. Please try again in a moment.
        </p>
        <button className="auth-submit" onClick={onRetry}>
          Try again
        </button>
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

        if (active) {
          window.clearTimeout(timeoutId);
          setReady(true);
        }
      } catch (error) {
        lastError = error;

        if (active) {
          retryId = window.setTimeout(check, RETRY_MS);
        }
      }
    };

    check();

    timeoutId = window.setTimeout(() => {
      if (active) {
        setMaintenance(true);
        reportMaintenance(lastError);
      }
    }, MAX_WAIT_MS);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      window.clearTimeout(retryId);
    };
  }, [attempt]);

  if (maintenance && !ready) {
    return (
      <MaintenanceScreen
        onRetry={() => {
          setReady(false);
          setMaintenance(false);
          setAttempt((current) => current + 1);
        }}
      />
    );
  }

  if (!ready) {
    return (
      <main className="backend-gate">
        <div className="backend-gate-card">
          <div className="backend-spinner" />
          <h1>Starting ConvertFlow</h1>
          <p>Connecting to the conversion service…</p>
        </div>
      </main>
    );
  }

  return children;
}
