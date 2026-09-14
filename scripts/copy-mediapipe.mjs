// MediaPipe wasm fayllarini public/models/wasm ga nusxalaydi (o'z serverimizdan beriladi, CDN'siz).
// dev/build oldidan avtomatik ishlaydi; public/models/wasm git'ga kirmaydi.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const dst = join(root, "public", "models", "wasm");
if (!existsSync(src)) {
  console.warn("[copy-mediapipe] @mediapipe/tasks-vision topilmadi — yuz aniqlash o'chiq bo'ladi");
  process.exit(0);
}
mkdirSync(dst, { recursive: true });
for (const f of ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"]) {
  cpSync(join(src, f), join(dst, f));
}
console.log("[copy-mediapipe] wasm -> public/models/wasm");
