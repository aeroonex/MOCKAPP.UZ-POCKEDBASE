import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(async ({ mode }) => {
  const plugins = [react()];

  // Dyad component tagger faqat dev rejimida — production bundle'ga data-atributlar qo'shilmaydi.
  if (mode === "development") {
    const { default: dyadComponentTagger } = await import("@dyad-sh/react-vite-component-tagger");
    plugins.unshift(dyadComponentTagger());
  }

  return {
    server: {
      host: "::",
      port: 8080,
      // Dev rejimda /api va /files so'rovlari lokal backendga (server/, port 4000) yo'naltiriladi
      // (production'da xuddi shu ishni nginx bajaradi).
      proxy: {
        "/api": { target: "http://127.0.0.1:4000", changeOrigin: true },
        "/files": { target: "http://127.0.0.1:4000", changeOrigin: true },
      },
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      sourcemap: false,
      target: "es2020",
      cssCodeSplit: true,
      chunkSizeWarningLimit: 600,
      // Eslatma: vendor kutubxonalarni qo'lda chunk'larga bo'lish (manualChunks) chunk'lar
      // orasida siklik bog'liqlik hosil qilib, production'da "Cannot read properties of
      // undefined (reading 'forwardRef')" xatosiga olib keldi. Rollup'ning o'z tartibiga ishonamiz;
      // sahifalar React.lazy orqali baribir alohida yuklanadi.
    },
  };
});
