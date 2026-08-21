import Header from "../components/Header";
import Hero from "../components/Hero";
import Converter from "../components/Converter";
import PopularConversions from "../components/PopularConversions";
import SecuritySection from "../components/SecuritySection";
import Footer from "../components/Footer";
import { Link } from "react-router-dom";

export default function Home() {
  return <div className="app"><Header/><main><Hero/><div id="converter"><Converter/></div><PopularConversions/><section className="seo-section"><span className="section-label">WHY CONVERTFLOW</span><h2>Free online file conversion without an account</h2><p>Convert common image, video, and audio formats from one simple browser-based tool. No sign-up wall and no subscription required for basic conversions.</p><div className="trust-grid"><article><strong>Simple</strong><span>Clear upload and conversion flow.</span></article><article><strong>Mobile ready</strong><span>Use ConvertFlow on phones, tablets, and desktops.</span></article><article><strong>Privacy minded</strong><span>Only upload files you are comfortable processing through an online service.</span></article></div></section><SecuritySection/><section className="seo-section feedback-section"><span className="section-label">CUSTOMER REVIEWS</span><h2>Share your ConvertFlow experience</h2><p>We are building a public review collection. Have feedback about speed, formats, or the interface?</p><Link className="auth-submit" to="/contact">Send feedback</Link></section><section className="seo-section"><span className="section-label">POPULAR TOOLS</span><div className="internal-links"><Link to="/services/image">Image converter</Link><Link to="/services/video">Video converter</Link><Link to="/services/audio">Audio converter</Link><Link to="/faq">Conversion FAQ</Link></div></section></main><Footer/></div>;
}
