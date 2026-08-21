import { Mail } from "lucide-react";
import { Link } from "react-router-dom";

const columns = [
  { title: "Convert", links: [["Image Converter","/services/image"],["Video Converter","/services/video"],["Audio Converter","/services/audio"],["All Formats","/convert"]] },
  { title: "Explore", links: [["Supported Formats","/formats"],["Conversion History","/history"],["System Status","/status"],["API Documentation","/api/docs"]] },
  { title: "Product", links: [["FAQ","/faq"],["Donate","/donate"],["About","/about"],["Contact","/contact"]] },
  { title: "Company", links: [["Privacy","/privacy"],["Terms","/terms"]] },
];

export default function Footer() {
  return <footer className="footer"><div className="footer-main"><div className="footer-brand"><Link to="/" className="brand"><div className="brand-icon">☁</div><span><span className="brand-light">Convert</span><span className="brand-bold">Flow</span></span></Link><p>A simple and powerful platform for converting supported files online.</p><div className="footer-socials"><a href="mailto:nivedsreejaharidasan@gmail.com" aria-label="Email ConvertFlow"><Mail size={18}/></a></div></div><div className="footer-links">{columns.map(column=><div className="footer-column" key={column.title}><h3>{column.title}</h3>{column.links.map(([label,to])=><Link to={to} key={label}>{label}</Link>)}</div>)}</div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} ConvertFlow. All rights reserved.</span><span>Made for fast and simple file conversion.</span></div></footer>;
}
