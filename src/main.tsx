import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource-variable/inter";
import "./globals.css";
import { ThemeProvider } from "./components/theme-provider.tsx";
import './i18n'; // i18n konfiguratsiyasini import qilish
import { I18nextProvider } from 'react-i18next'; // I18nextProvider import qilish
import i18n from './i18n'; // i18n instansiyasini import qilish

// Deploy'dan keyin eski sahifa yangi bo'laklarni topolmasa (chunk 404) — sahifani bir marta yangilaymiz.
const reloadOnce = () => {
  try {
    const KEY = "chunk-reload-at";
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 15000) return; // qayta-qayta yangilanib qolmaslik uchun
    sessionStorage.setItem(KEY, String(Date.now()));
    location.reload();
  } catch {
    location.reload();
  }
};
window.addEventListener("vite:preloadError", (e) => {
  e.preventDefault();
  reloadOnce();
});
window.addEventListener("unhandledrejection", (e) => {
  const msg = String((e.reason && (e.reason.message || e.reason)) || "");
  if (/Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(msg)) {
    reloadOnce();
  }
});

createRoot(document.getElementById("root")!).render(
  <I18nextProvider i18n={i18n}> {/* App ni I18nextProvider bilan o'rash */}
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme" attribute="class">
      <App />
    </ThemeProvider>
  </I18nextProvider>
);