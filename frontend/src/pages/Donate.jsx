import { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

const BMC_URL = "https://www.buymeacoffee.com/powerplayexe";

export default function Donate() {
  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const widget = document.createElement("script");
    widget.dataset.name = "BMC-Widget";
    widget.dataset.cfasync = "false";
    widget.src = "https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js";
    widget.dataset.id = "powerplayexe";
    widget.dataset.description = "Support ConvertFlow on Buy Me a Coffee";
    widget.dataset.message = "Thanks for supporting ConvertFlow!";
    widget.dataset.color = "#FFDD00";
    widget.dataset.position = "Right";
    widget.dataset.x_margin = "18";
    widget.dataset.y_margin = "18";
    widget.async = true;
    document.body.appendChild(widget);
    return () => { widget.remove(); document.getElementById("bmc-wbtn")?.remove(); };
  }, []);

  function donate() {
    const clean = name.trim();
    if (!clean) return;
    localStorage.setItem("convertflow_donor_name", clean);
    setStarted(true);
    window.open(BMC_URL, "_blank", "noopener,noreferrer");
  }

  return <div className="app"><Header/><main className="donate-page"><section className="donate-hero"><div className="donate-copy"><span className="section-label">KEEP CONVERTFLOW FREE</span><h1>Support the tools you use.</h1><p>ConvertFlow is free to use. Your support helps cover infrastructure and add more conversion formats.</p><div className="donate-benefits"><span>✓ Free conversions stay free</span><span>✓ More formats and improvements</span><span>✓ No subscription required</span></div><label htmlFor="donor-name">Your name</label><input id="donor-name" value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your name" maxLength={80}/><button className="auth-submit" type="button" onClick={donate} disabled={!name.trim()}>☕ Continue to Buy Me a Coffee</button>{started && <p className="donate-note">Thanks, {name.trim()}! The donation page has been opened.</p>}<p className="donate-note">Your name stays on this device. Buy Me a Coffee handles the payment.</p></div><aside className="donate-qr-card"><span className="section-label">SCAN TO SUPPORT</span><img loading="lazy" src="/bmc-qr-placeholder.svg" alt="Buy Me a Coffee QR placeholder"/><h2>Prefer a QR code?</h2><p>Replace the placeholder with your own Buy Me a Coffee QR image when ready.</p></aside></section></main><Footer/></div>;
}
