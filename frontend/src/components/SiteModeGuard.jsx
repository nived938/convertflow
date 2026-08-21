import { useEffect, useState } from "react";

const SITE_MODE_URL = "/api/site-mode";

function LoadingScreen() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#070b12", color: "white", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 520 }}>
        <div style={{ width: 42, height: 42, margin: "0 auto 22px", border: "3px solid rgba(255,255,255,.18)", borderTopColor: "white", borderRadius: "50%", animation: "cf-spin .8s linear infinite" }} />
        <h1 style={{ margin: 0, fontSize: 28 }}>Loading ConvertFlow</h1>
        <p style={{ opacity: .65, marginTop: 10 }}>Checking the current site status...</p>
        <style>{`@keyframes cf-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </main>
  );
}

function MaintenancePage() {
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#080b12,#111827)", color: "white", padding: 24 }}><section style={{ width: "min(680px,100%)", textAlign: "center", padding: 48, border: "1px solid rgba(255,255,255,.1)", borderRadius: 28, background: "rgba(255,255,255,.04)", boxShadow: "0 30px 100px rgba(0,0,0,.35)" }}><div style={{ fontSize: 52, marginBottom: 18 }}>🔧</div><p style={{ letterSpacing: 2, fontWeight: 800, fontSize: 12, opacity: .55 }}>CONVERTFLOW</p><h1 style={{ fontSize: "clamp(34px,6vw,58px)", margin: "10px 0 16px" }}>We'll be right back</h1><p style={{ fontSize: 17, lineHeight: 1.7, opacity: .7, margin: 0 }}>ConvertFlow is temporarily unavailable while we perform maintenance. Please try again shortly.</p></section></main>;
}

function NotFoundModePage() {
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#05070b", color: "white", padding: 24 }}><section style={{ textAlign: "center" }}><div style={{ fontSize: "clamp(90px,18vw,180px)", lineHeight: .9, fontWeight: 900, letterSpacing: -10 }}>404</div><h1 style={{ margin: "24px 0 10px", fontSize: 32 }}>Page not found</h1><p style={{ opacity: .6 }}>The page you are looking for does not exist.</p></section></main>;
}

export default function SiteModeGuard({ children }) {
  const [state, setState] = useState({ loading: true, mode: "normal" });

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();

    async function readMode() {
      try {
        const response = await fetch(SITE_MODE_URL, { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        return data.success ? data.mode : "normal";
      } catch {
        return "normal";
      }
    }

    (async () => {
      const modePromise = readMode();
      const mode = await modePromise;
      const remaining = Math.max(0, 2000 - (Date.now() - started));
      await new Promise(resolve => setTimeout(resolve, remaining));
      if (!cancelled) setState({ loading: false, mode });
    })();

    return () => { cancelled = true; };
  }, []);

  if (state.loading) return <LoadingScreen />;
  if (state.mode === "maintenance") return <MaintenancePage />;
  if (state.mode === "not_found") return <NotFoundModePage />;
  return children;
}
