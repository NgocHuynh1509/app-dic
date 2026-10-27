import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import LocalLicenseGate from "./components/LocalLicenseGate";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LocalLicenseGate>
      <App />
    </LocalLicenseGate>
  </StrictMode>
);