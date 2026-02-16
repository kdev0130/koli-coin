import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const savedTheme = localStorage.getItem("koli-theme");
const shouldUseDark = savedTheme ? savedTheme === "dark" : true;
document.documentElement.classList.toggle("dark", shouldUseDark);

function initApp() {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error("Root element not found. DOM state:", {
      readyState: document.readyState,
      body: document.body,
      root: document.getElementById("root")
    });
    throw new Error("Failed to find the root element");
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

// Wait for DOM to be fully ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else if (document.readyState === "interactive") {
  // DOM is still loading, wait for complete
  if (document.getElementById("root")) {
    initApp();
  } else {
    document.addEventListener("DOMContentLoaded", initApp);
  }
} else {
  // DOM is already complete
  initApp();
}
