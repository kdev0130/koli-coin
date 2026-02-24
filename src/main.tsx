import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    __koliDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

const savedTheme = localStorage.getItem("koli-theme");
const shouldUseDark = savedTheme ? savedTheme === "dark" : true;
document.documentElement.classList.toggle("dark", shouldUseDark);

window.__koliDeferredInstallPrompt = window.__koliDeferredInstallPrompt ?? null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  window.__koliDeferredInstallPrompt = event as BeforeInstallPromptEvent;
  window.dispatchEvent(new CustomEvent("koli:installprompt-ready"));
});

window.addEventListener("appinstalled", () => {
  window.__koliDeferredInstallPrompt = null;
  window.dispatchEvent(new CustomEvent("koli:app-installed"));
});

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
