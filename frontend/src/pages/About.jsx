import Header from "../components/Header";
import Footer from "../components/Footer";

const features = [
  ["Convert files", "Choose an output format and convert supported images, audio, and video files in one place."],
  ["Batch conversion", "Add multiple files, select an output format for each one, and get a single ZIP download."],
  ["Conversion progress", "Follow upload, processing, archive creation, and completion in real time."],
  ["100 MB upload limit", "A clear upload limit keeps conversion requests predictable and reliable."],
  ["Temporary downloads", "Completed files are kept temporarily and cleaned up automatically."],
  ["No account required", "Use the main converter without creating a login or sharing account information."],
  ["Mobile friendly", "Use the converter from modern desktop and mobile browsers."],
  ["Free to use", "The main converter remains free. Optional contributions help fund future improvements."],
];

export default function About() {
  return <div className="app"><Header/><main className="about-page"><section className="about-hero"><span className="section-label">ABOUT CONVERTFLOW</span><h1>Simple conversion tools, built for real work.</h1><p>ConvertFlow makes everyday file conversion easier: upload a supported file, choose the output you need, and download the result without a complicated workflow or account.</p></section><section className="about-values"><article><span className="section-label">FAST</span><h2>One clear workflow</h2><p>Upload, choose, convert, and download with useful progress at every step.</p></article><article><span className="section-label">PRIVATE</span><h2>Files are temporary</h2><p>Conversion files are stored only long enough to make the download available, then cleaned up.</p></article><article><span className="section-label">GROWING</span><h2>More formats are coming</h2><p>ConvertFlow is expanding supported formats and conversion options over time.</p></article></section><section className="about-features"><div className="about-section-heading"><span className="section-label">FEATURES</span><h2>What ConvertFlow can do today</h2></div><div className="about-feature-grid">{features.map(([title,description])=><article key={title}><h3>{title}</h3><p>{description}</p></article>)}</div></section><section className="about-roadmap"><span className="section-label">NEXT UP</span><h2>Designed to keep getting better.</h2><p>Upcoming work includes more document conversion support, richer conversion settings, broader codecs, and additional integrations.</p></section></main><Footer/></div>;
}
