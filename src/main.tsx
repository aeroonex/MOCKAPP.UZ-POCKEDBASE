import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource-variable/inter";
import "./globals.css";
import { ThemeProvider } from "./components/theme-provider.tsx";
import './i18n'; // i18n konfiguratsiyasini import qilish
import { I18nextProvider } from 'react-i18next'; // I18nextProvider import qilish
import i18n from './i18n'; // i18n instansiyasini import qilish

/**
 * Deploy'dan keyin eski sahifa yangi bo'laklarni topolmasa (chunk 404) — sahifani yangilaymiz.
 * MUHIM: eng ko'pi 2 marta. Fayl haqiqatan yo'q bo'lsa (yoki reklama bloklovchi to'sib qo'ysa)
 * cheksiz qayta yuklanish tsikli hosil bo'lmasin — o'rniga qisqa xabar ko'rsatamiz.
 */
const MAX_CHUNK_RELOADS = 2;
const reloadOnce = () => {
  let tries = 0;
  try {
    tries = Number(sessionStorage.getItem("chunk-reload-count") || 0);
    const last = Number(sessionStorage.getItem("chunk-reload-at") || 0);
    if (Date.now() - last < 15000) return; // bir necha xato ketma-ket kelsa bir marta yangilaymiz
  } catch {
    location.reload();
    return;
  }
  if (tries >= MAX_CHUNK_RELOADS) {
    const el = document.getElementById("chunk-reload-note");
    if (!el) {
      const note = document.createElement("div");
      note.id = "chunk-reload-note";
      note.style.cssText =
        "position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:2147483000;max-width:92vw;" +
        "padding:12px 16px;border-radius:12px;background:#7f1d1d;color:#fff;" +
        "font:600 13px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 12px 30px -10px rgba(0,0,0,.6)";
      note.textContent = "Sahifa to'liq yuklanmadi. Iltimos, brauzer keshini tozalab (Ctrl+Shift+R) qayta kiring.";
      document.body.appendChild(note);
    }
    return;
  }
  try {
    sessionStorage.setItem("chunk-reload-count", String(tries + 1));
    sessionStorage.setItem("chunk-reload-at", String(Date.now()));
  } catch {
    /* ignore */
  }
  location.reload();
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