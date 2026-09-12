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
      rollupOptions: {
        output: {
          // Vendor kutubxonalarni alohida chunk'larga ajratish — brauzer keshi uzoq saqlaydi,
          // ilova kodi o'zgarganda faqat kichik chunk qayta yuklanadi.
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("/react-dom/") || id.includes("/react/") || id.includes("/scheduler/")) return "vendor-react";
            if (id.includes("react-router")) return "vendor-router";
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
            if (id.includes("i18next")) return "vendor-i18n";
            if (id.includes("/pocketbase/")) return "vendor-pocketbase";
            if (id.includes("@fontsource")) return "vendor-fonts";
            return "vendor";
          },
        },
      },
    },
  };
});
