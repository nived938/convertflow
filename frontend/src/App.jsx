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
import Api from "./pages/Api";
import ApiDocs from "./pages/ApiDocs";
import Status from "./pages/Status";
import Formats from "./pages/Formats";
import SiteModeGuard from "./components/SiteModeGuard";
import SeoManager from "./components/SeoManager";
import AdminLogin from "./pages/AdminLogin";
import AdminControl from "./pages/AdminControl";
function PublicRoutes(){return <SiteModeGuard><Routes><Route path="/" element={<Home/>}/><Route path="/convert" element={<ConversionPage/>}/><Route path="/donate" element={<Donate/>}/><Route path="/about" element={<About/>}/><Route path="/faq" element={<FAQ/>}/><Route path="/contact" element={<Contact/>}/><Route path="/privacy" element={<Privacy/>}/><Route path="/terms" element={<Terms/>}/><Route path="/api" element={<Api/>}/><Route path="/api/docs" element={<ApiDocs/>}/><Route path="/status" element={<Status/>}/><Route path="/formats" element={<Formats/>}/><Route path="/services/:type" element={<ServicePage/>}/><Route path="/locations/:location" element={<LocationPage/>}/><Route path="*" element={<NotFound/>}/></Routes></SiteModeGuard>}
export default function App(){return <BrowserRouter><SeoManager/><Routes><Route path="/admin" element={<AdminLogin/>}/><Route path="/admin/control" element={<AdminControl/>}/><Route path="*" element={<PublicRoutes/>}/></Routes></BrowserRouter>}
