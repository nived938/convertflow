import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./light-mode.css";
import "./seo.css";
import "./button-width-fix.css";
import "./growth.css";
import "./enhancements.css";
import "./scrollbar.css";

// Load Puter.js at runtime so Vite does not process the external script as an HTML asset.
if (!document.querySelector('script[data-puter-sdk="true"]')) {
  const script = document.createElement("script");
  script.src = "https://js.puter.com/v2/";
  script.async = true;
  script.dataset.puterSdk = "true";
  document.head.appendChild(script);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
