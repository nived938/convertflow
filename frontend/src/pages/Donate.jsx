import { useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

const BMC_URL = "https://www.buymeacoffee.com/powerplayexe";

export default function Donate() {
  const buttonContainer = useRef(null);
  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const buttonScript = document.createElement("script");
    buttonScript.src = "https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js";
    buttonScript.dataset.name = "bmc-button";
    buttonScript.dataset.slug = "powerplayexe";
    buttonScript.dataset.color = "#FFDD00";
    buttonScript.dataset.emoji = "❤️";
    buttonScript.dataset.font = "Cookie";
    buttonScript.dataset.text = "Support ConvertFlow";
    buttonScript.dataset.outlineColor = "#000000";
    buttonScript.dataset.fontColor = "#000000";
    buttonScript.dataset.coffeeColor = "#ffffff";
    buttonContainer.current?.appendChild(buttonScript);
    return () => { buttonScript.remove(); document.getElementById("bmc-wbtn")?.remove(); };
  }, []);

  function donate() {
    const clean = name.trim();
    if (!clean) return;
    localStorage.setItem("convertflow_donor_name", clean);
    setStarted(true);
    window.open(BMC_URL, "_blank", "noopener,noreferrer");
  }

  return <div className="app"><Header/><main className="donate-page"><section className="donate-hero"><div className="donate-copy"><span className="section-label">KEEP CONVERTFLOW FREE</span><h1>Support the tools you use.</h1><p>ConvertFlow is free to use. Your support helps cover infrastructure and add more conversion formats.</p><div className="donate-benefits"><span>✓ Free conversions stay free</span><span>✓ More formats and improvements</span><span>✓ No subscription required</span></div><label htmlFor="donor-name">Your name</label><input id="donor-name" value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your name" maxLength={80}/><button className="auth-submit" type="button" onClick={donate} disabled={!name.trim()}>☕ Continue to Buy Me a Coffee</button>{started && <p className="donate-note">Thanks, {name.trim()}! The donation page has been opened.</p>}<div className="bmc-button-container" ref={buttonContainer}/><p className="donate-note">Your name is only used locally on this device. Payment details are handled by Buy Me a Coffee.</p></div><aside className="donate-qr-card"><span className="section-label">SCAN TO SUPPORT</span><img loading="lazy" src="/bmc-qr-placeholder.svg" alt="Buy Me a Coffee QR placeholder"/><h2>Prefer a QR code?</h2><p>Replace the placeholder with your own Buy Me a Coffee QR image when ready.</p></aside></section></main><Footer/></div>;
}
