import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function NotFound() {
  return (
    <div className="app">
      <Header />
      <main className="not-found-page">
        <span className="section-label">ERROR 404</span>
        <h1>This page went missing.</h1>
        <p>The link may be outdated, or the page may have moved.</p>
        <div className="not-found-actions">
          <Link to="/" className="auth-submit">Go home</Link>
          <Link to="/convert" className="not-found-link">Convert a file</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
