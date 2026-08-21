import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Contact() {
  return <div className="app"><Header /><main className="content-page"><span className="section-label">CONTACT</span><h1>Contact ConvertFlow</h1><p>Found a conversion problem, missing format, or website issue?</p><div className="info-card"><h2>Get in touch</h2><p>Email the ConvertFlow team at <a href="mailto:nivedsreejaharidasan@gmail.com">nivedsreejaharidasan@gmail.com</a>.</p><p>When reporting a problem, include the input format, requested output format, and the error message if one is shown. Please do not send private or sensitive files.</p></div></main><Footer /></div>;
}
