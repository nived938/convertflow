import Header from "../components/Header";
import Footer from "../components/Footer";

const plans = [
  { id: "month", label: "1 month", price: "$1" },
  { id: "year", label: "1 year", price: "$5" },
  { id: "permanent", label: "Permanent", price: "$8" },
];

function buy(plan) {
  const subject = `Buying API of ConvertFlow for ${plan.label}`;
  const body = `Hello Nived,\n\nI would like to buy the ConvertFlow API for ${plan.label}.\n\nPlease send me the payment instructions and API access details.\n\nThank you.`;
  const params = new URLSearchParams({ to: "nivedsreejaharidasan@gmail.com", su: subject, body });
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`;
  const mailtoUrl = `mailto:nivedsreejaharidasan@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const popup = window.open(gmailUrl, "_blank", "noopener,noreferrer");
  if (!popup) window.location.href = mailtoUrl;
}

export default function Api() {
  return <div className="app"><Header/><main style={{ width: "min(1000px, calc(100% - 32px))", margin: "0 auto", padding: "80px 0" }}>
    <section style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 48px" }}><span className="section-label">CONVERTFLOW API</span><h1 style={{ fontSize: "clamp(38px,7vw,68px)", margin: "12px 0 18px" }}>Build with ConvertFlow</h1><p style={{ fontSize: 17, lineHeight: 1.7, opacity: .65 }}>Get an API key and use ConvertFlow's conversion features in your own applications and workflows. Contact us first, then we'll send payment instructions.</p></section>
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>{plans.map(plan => <article key={plan.id} style={{ padding: 28, border: "1px solid var(--border,#273244)", borderRadius: 22, background: "rgba(255,255,255,.03)" }}><p style={{ margin: 0, opacity: .55 }}>{plan.label}</p><h2 style={{ fontSize: 42, margin: "8px 0 16px" }}>{plan.price}</h2><p style={{ opacity: .6, minHeight: 52 }}>API access for your project, with a key managed from the ConvertFlow admin panel.</p><button className="header-signup" style={{ border: 0, cursor: "pointer", width: "100%" }} onClick={() => buy(plan)}>Contact us to buy</button></article>)}</section>
    <p style={{ textAlign: "center", marginTop: 34, opacity: .5 }}>Email: nivedsreejaharidasan@gmail.com</p>
  </main><Footer/></div>;
}
