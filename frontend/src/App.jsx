import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Donate from "./pages/Donate";
import ConversionPage from "./pages/ConversionPage";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import ServicePage from "./pages/ServicePage";
import LocationPage from "./pages/LocationPage";
import BackendGuard from "./components/BackendGuard";
import SeoManager from "./components/SeoManager";
import AdminLogin from "./pages/AdminLogin";
import AdminControl from "./pages/AdminControl";

function PublicRoutes() {
  return (
    <BackendGuard>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/convert" element={<ConversionPage />} />
        <Route path="/donate" element={<Donate />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/services/:type" element={<ServicePage />} />
        <Route path="/locations/:location" element={<LocationPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BackendGuard>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SeoManager />
      <Routes>
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/control" element={<AdminControl />} />
        <Route path="*" element={<PublicRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
