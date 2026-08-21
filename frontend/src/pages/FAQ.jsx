import Header from "../components/Header";
import Footer from "../components/Footer";

const faqs = [
  ["Is ConvertFlow free?", "Yes. ConvertFlow is designed as a free online converter with no account required."],
  ["Do I need to sign up?", "No. Upload a file, choose an output format, convert it, and download it."],
  ["What file types are supported?", "ConvertFlow supports common image, video, and audio formats, with more formats being added over time."],
  ["Are my files stored permanently?", "Conversion files are processed for conversion and are not intended to be a permanent file-storage service."],
  ["Can I use ConvertFlow on mobile?", "Yes. The interface is responsive and designed for phones, tablets, and desktop browsers."],
  ["Why might conversion fail?", "Some formats require codecs or conversion features that are not available on the server. If a conversion fails, try a common output format or contact us."],
];

export default function FAQ() {
  return <div className="app"><Header /><main className="content-page"><span className="section-label">HELP CENTER</span><h1>Frequently asked questions</h1><p>Everything you need to know about using ConvertFlow.</p><section className="faq-grid">{faqs.map(([q,a]) => <article className="faq-card" key={q}><h2>{q}</h2><p>{a}</p></article>)}</section></main><Footer /></div>;
}
