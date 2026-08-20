import {
  ArrowRight,
  FileText,
  RefreshCw,
} from "lucide-react";

export default function Hero() {
  return (
    <section className="hero">

      <div className="hero-background" />

      <div className="hero-content">

        <div className="hero-text">
          <div className="eyebrow">
            POWERFUL FILE CONVERSION
          </div>

          <h1>
            Convert
            <span> Any File</span>
          </h1>

          <p>
            Convert documents, images, audio, video, archives
            and more with a fast and simple online converter.
          </p>
        </div>

        <div className="conversion-animation">

          <div className="orbit orbit-large" />
          <div className="orbit orbit-small" />

          <div className="format-card">
            <FileText size={30} />
            <strong>PDF</strong>
            <span>Document</span>
          </div>

          <div className="conversion-arrow">
            <div className="arrow-line" />
            <ArrowRight size={20} />
          </div>

          <div className="format-card output-card">
            <FileText size={30} />
            <strong>DOCX</strong>
            <span>Word Document</span>
          </div>

          <div className="refresh-icon">
            <RefreshCw size={15} />
          </div>

        </div>

      </div>
    </section>
  );
}