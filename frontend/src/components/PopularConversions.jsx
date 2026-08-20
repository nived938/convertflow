import {
  ArrowRight,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
} from "lucide-react";

const conversions = [
  {
    from: "PDF",
    to: "DOCX",
    title: "PDF to Word",
    description: "Convert PDF documents into editable Word files.",
    icon: FileText,
  },
  {
    from: "JPG",
    to: "PNG",
    title: "JPG to PNG",
    description: "Convert JPG images into high-quality PNG files.",
    icon: FileImage,
  },
  {
    from: "MP4",
    to: "MP3",
    title: "MP4 to MP3",
    description: "Extract audio from your MP4 videos.",
    icon: FileVideo,
  },
  {
    from: "MP3",
    to: "WAV",
    title: "MP3 to WAV",
    description: "Convert compressed audio into WAV format.",
    icon: FileAudio,
  },
];

export default function PopularConversions() {
  return (
    <section className="popular-section">

      <div className="section-heading">
        <span className="section-label">
          POPULAR CONVERSIONS
        </span>

        <h2>
          Convert files in seconds
        </h2>

        <p>
          Choose from some of the most popular conversion
          formats.
        </p>
      </div>

      <div className="popular-grid">

        {conversions.map((conversion) => {
          const Icon = conversion.icon;

          return (
            <a
              href="#converter"
              className="popular-card"
              key={conversion.title}
            >
              <div className="popular-icon">
                <Icon size={22} />
              </div>

              <div className="popular-content">
                <div className="format-flow">
                  <span>{conversion.from}</span>

                  <ArrowRight size={14} />

                  <span>{conversion.to}</span>
                </div>

                <h3>
                  {conversion.title}
                </h3>

                <p>
                  {conversion.description}
                </p>
              </div>

              <ArrowRight
                size={17}
                className="popular-arrow"
              />
            </a>
          );
        })}

      </div>
    </section>
  );
}