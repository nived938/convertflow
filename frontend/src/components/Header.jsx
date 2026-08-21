import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);
  const link = (to, label) => (
    <NavLink to={to} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} onClick={close}>{label}</NavLink>
  );
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="header-logo" onClick={close}>ConvertFlow</Link>
        <nav className={`header-nav ${mobileOpen ? "mobile-open" : ""}`}>
          {link("/", "Home")}
          {link("/convert", "Convert")}
          {link("/services/image", "Image")}
          {link("/services/video", "Video")}
          {link("/services/audio", "Audio")}
          {link("/faq", "FAQ")}
          {link("/about", "About")}
          <Link to="/donate" className="header-signup" onClick={close}>Donate ☕</Link>
        </nav>
        <button className={`mobile-menu-button ${mobileOpen ? "open" : ""}`} type="button" aria-label="Toggle navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(v => !v)}>
          <span /><span /><span />
        </button>
      </div>
    </header>
  );
}
