import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import BackendGate from "./components/BackendGate";

import {
  AuthProvider,
} from "./context/AuthContext";

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <BackendGate>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BackendGate>
  </React.StrictMode>
);
