import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { ThemeProvider } from "./components/theme-provider.tsx";
import './i18n'; // i18n konfiguratsiyasini import qilish
import { I18nextProvider } from 'react-i18next'; // I18nextProvider import qilish
import i18n from './i18n'; // i18n instansiyasini import qilish

createRoot(document.getElementById("root")!).render(
  <I18nextProvider i18n={i18n}> {/* App ni I18nextProvider bilan o'rash */}
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme" attribute="class">
      <App />
    </ThemeProvider>
  </I18nextProvider>
);