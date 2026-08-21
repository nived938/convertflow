import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const pages = {
  "/": ["ConvertFlow, Free Online File Converter", "Convert common image, video, and audio files online with ConvertFlow. No account required."],
  "/convert": ["Online File Converter, ConvertFlow", "Convert supported image, video, and audio files online quickly with ConvertFlow."],
  "/about": ["About ConvertFlow", "Learn about ConvertFlow and our goal of making online file conversion simple."],
  "/faq": ["File Converter FAQ, ConvertFlow", "Answers to common questions about ConvertFlow file conversion."],
  "/contact": ["Contact ConvertFlow", "Contact ConvertFlow about conversion errors, missing formats, or website issues."],
  "/donate": ["Support ConvertFlow", "Support ConvertFlow and help keep free file conversion available."],
  "/privacy": ["Privacy Policy, ConvertFlow", "ConvertFlow privacy policy and information about files, analytics, and donations."],
  "/terms": ["Terms and Conditions, ConvertFlow", "Terms and conditions for using ConvertFlow online conversion tools."],
};

export default function SeoManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    const [title, description] = pages[pathname] || (pathname.startsWith("/services/") ? ["Online File Converter, ConvertFlow", "Convert supported files online with ConvertFlow."] : pathname.startsWith("/locations/") ? ["Free Online File Converter, ConvertFlow", "Use ConvertFlow online from your location without an account."] : ["ConvertFlow, Free Online File Converter", "Free online file conversion for common image, video, and audio formats."]);
    document.title = title;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.appendChild(meta); }
    meta.content = description;
  }, [pathname]);
  return null;
}
