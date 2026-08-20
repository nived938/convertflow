import {
  useEffect,
  useRef,
} from "react";

import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Donate() {
  const buttonContainer = useRef(null);

  useEffect(() => {
    const buttonScript = document.createElement("script");
    buttonScript.type = "text/javascript";
    buttonScript.src = "https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js";
    buttonScript.dataset.name = "bmc-button";
    buttonScript.dataset.slug = "powerplayexe";
    buttonScript.dataset.color = "#FFDD00";
    buttonScript.dataset.emoji = "❤️";
    buttonScript.dataset.font = "Cookie";
    buttonScript.dataset.text = "Support This Website";
    buttonScript.dataset.outlineColor = "#000000";
    buttonScript.dataset.fontColor = "#000000";
    buttonScript.dataset.coffeeColor = "#ffffff";
    buttonContainer.current?.appendChild(buttonScript);

    const widgetScript = document.createElement("script");
    widgetScript.dataset.name = "BMC-Widget";
    widgetScript.dataset.cfasync = "false";
    widgetScript.src = "https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js";
    widgetScript.dataset.id = "powerplayexe";
    widgetScript.dataset.description = "Support me on Buy me a coffee!";
    widgetScript.dataset.message = "";
    widgetScript.dataset.color = "#FF813F";
    widgetScript.dataset.position = "Right";
    widgetScript.dataset.x_margin = "18";
    widgetScript.dataset.y_margin = "18";
    document.body.appendChild(widgetScript);

    return () => {
      buttonScript.remove();
      widgetScript.remove();
      document.getElementById("bmc-wbtn")?.remove();
    };
  }, []);

  return (
    <div className="app">
      <Header />

      <main className="donate-page">
        <section className="donate-hero">
          <div className="donate-copy">
            <span className="section-label">KEEP CONVERTFLOW FREE</span>
            <h1>Support the tools you use.</h1>
            <p>
              ConvertFlow is free to use. A small contribution helps cover
              infrastructure, improve conversions, and keep new features moving.
            </p>

            <div className="donate-benefits">
              <span>✓ Free conversions stay free</span>
              <span>✓ Supports new formats and improvements</span>
              <span>✓ No subscription required</span>
            </div>

            <div className="bmc-button-container" ref={buttonContainer} />
            <p className="donate-note">Secure payments are handled by Buy Me a Coffee.</p>
          </div>

          <aside className="donate-qr-card">
            <span className="section-label">SCAN TO SUPPORT</span>
            <img
              src="/bmc-qr-placeholder.svg"
              alt="Placeholder for your Buy Me a Coffee QR code"
            />
            <h2>Prefer a QR code?</h2>
            <p>
              Replace <code>bmc-qr-placeholder.svg</code> with your own Buy Me a Coffee QR image when ready.
            </p>
          </aside>
        </section>

        <section className="donate-transparency">
          <div>
            <span className="section-label">WHAT IT HELPS FUND</span>
            <h2>Every contribution has a practical impact.</h2>
          </div>
          <div className="donate-impact-grid">
            <article><strong>Reliable processing</strong><span>Storage and conversion infrastructure.</span></article>
            <article><strong>More file formats</strong><span>New conversion paths and smarter options.</span></article>
            <article><strong>Safer accounts</strong><span>Security upgrades such as email verification.</span></article>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
