import { Mail } from "lucide-react";
import { Link } from "react-router-dom";

const columns = [
  {
    title: "Convert",
    links: [
      "Image Converter",
      "Video Converter",
      "Audio Converter",
      "Document Converter",
      "PDF Converter",
    ],
  },
  {
    title: "Product",
    links: [
      "Features",
      "Donate",
      "API",
      "Security",
      "Supported Formats",
    ],
  },
  {
    title: "Company",
    links: [
      "About",
      "Contact",
      "Privacy",
      "Terms",
      "Status",
    ],
  },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-main">

        <div className="footer-brand">

          <a href="/" className="brand">
            <div className="brand-icon">
              ☁
            </div>

            <span>
              <span className="brand-light">
                Convert
              </span>
              <span className="brand-bold">
                Flow
              </span>
            </span>
          </a>

          <p>
            A simple and powerful platform for converting
            files online.
          </p>

          <div className="footer-socials">

            <a
              href="mailto:hello@convertflow.com"
              aria-label="Email"
            >
              <Mail size={18} />
            </a>

          </div>

        </div>

        <div className="footer-links">

          {columns.map((column) => (
            <div
              className="footer-column"
              key={column.title}
            >
              <h3>
                {column.title}
              </h3>

              {column.links.map((link) => {
                if (link === "About") {
                  return <Link to="/about" key={link}>{link}</Link>;
                }

                if (link === "Donate") {
                  return <Link to="/donate" key={link}>{link}</Link>;
                }

                return <a href="#" key={link}>{link}</a>;
              })}
            </div>
          ))}

        </div>

      </div>

      <div className="footer-bottom">

        <span>
          © {new Date().getFullYear()} ConvertFlow.
          All rights reserved.
        </span>

        <span>
          Made for fast and simple file conversion.
        </span>

      </div>
    </footer>
  );
}
