/**
 * O'quv markazlar ro'yxati va nomlarni BIRXILLASHTIRISH.
 *
 * Muammo: o'quvchilar markaz nomini qo'lda yozganda "Younine Academy", "younine academy",
 * "You9", "You nine", "Younine" — hammasi alohida qator bo'lib statistikani buzardi.
 * Yechim: botda tanlash tugmalari (har sahifada 10 ta) + eski/qo'lda kiritilgan nomlarni
 * shu yerdagi taqqoslash orqali bitta kanonik nomga keltirish.
 */

/** Botda ko'rsatiladigan ro'yxat (tashkilotchi o'zgartirmagan bo'lsa). Eng ko'p ishlatilganlar tepada. */
export const DEFAULT_CENTERS: string[] = [
  "Younine Academy",
  "Younine Kids",
  "Younine Science",
  "CEFR Centre",
  "CEFR Zone",
  "CEFR LC",
  "IELTS Zone",
  "Registon",
  "Blitz",
  "Wegwiser",
  "Internation",
  "Opus",
  "Pro Academy",
  "Vim Learning Center",
  "Vegas Academy",
  "Wall Street",
];

/** Mustaqil o'qiydiganlar uchun maxsus qiymat (markaz emas). */
export const SELF_STUDY = "Mustaqil";

/**
 * Qo'lda yozilgan variantlar -> kanonik nom.
 * Kalitlar `norm()` ko'rinishida (kichik harf, faqat harf/raqam).
 */
const ALIASES: Record<string, string> = {
  // Younine
  y9: "Younine Academy",
  you9: "Younine Academy",
  younine: "Younine Academy",
  youninacademy: "Younine Academy",
  younineakademiya: "Younine Academy",
  youninelc: "Younine Academy",
  youninelearningcentre: "Younine Academy",
  youninelearningcenter: "Younine Academy",
  y9academy: "Younine Academy",
  younin: "Younine Academy",
  yonine: "Younine Academy",
  younine9: "Younine Academy",
  youninekid: "Younine Kids",
  youninekidsacademy: "Younine Kids",
  // CEFR
  cefr: "CEFR Centre",
  cefrcentr: "CEFR Centre",
  cefrcenter: "CEFR Centre",
  cefrsentr: "CEFR Centre",
  sefrcentre: "CEFR Centre",
  cefrl: "CEFR LC",
  cefrlearningcentre: "CEFR LC",
  cefrlearningcenter: "CEFR LC",
  // Boshqalar
  vegas: "Vegas Academy",
  vegasakademiya: "Vegas Academy",
  opusacademy: "Opus",
  opuslc: "Opus",
  proacademi: "Pro Academy",
  pro: "Pro Academy",
  vim: "Vim Learning Center",
  vimlc: "Vim Learning Center",
  vimlearningcentre: "Vim Learning Center",
  wallstreetenglish: "Wall Street",
  wallstreat: "Wall Street",
  ieltszona: "IELTS Zone",
  ieltzone: "IELTS Zone",
  cefrzona: "CEFR Zone",
  registonlc: "Registon",
  registonacademy: "Registon",
  wegwizer: "Wegwiser",
  vegwiser: "Wegwiser",
  international: "Internation",
  // Mustaqil
  mustaqil: SELF_STUDY,
  mustaqiloqiyman: SELF_STUDY,
  ozim: SELF_STUDY,
  ozimoqiyman: SELF_STUDY,
  yoq: SELF_STUDY,
};

/** Taqqoslash uchun soddalashtirish: kichik harf, faqat harf va raqamlar. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/['`’ʼ]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/** Kanonik nomlar indeksi (norm -> asl yozilishi). */
function canonicalIndex(list: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of list) map.set(norm(c), c);
  map.set(norm(SELF_STUDY), SELF_STUDY);
  for (const [k, v] of Object.entries(ALIASES)) map.set(k, v);
  return map;
}

/**
 * Yozilgan nomni kanonik nomga keltiradi. Tanish bo'lmasa — o'zini qaytaradi
 * (faqat bo'sh joylar tozalanadi), ya'ni yangi markaz nomi yo'qolmaydi.
 */
export function canonicalCenter(raw: string, list: string[] = DEFAULT_CENTERS): string {
  const trimmed = (raw || "").trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const index = canonicalIndex(list);
  const n = norm(trimmed);
  if (!n) return trimmed;
  const exact = index.get(n);
  if (exact) return exact;
  // "3/4 · 🏫 O'quv markaz Younine Academy" kabi ichida nomi bor matnlar
  let best: { name: string; len: number } | null = null;
  for (const [key, name] of index) {
    if (key.length < 5 || !n.includes(key)) continue;
    if (!best || key.length > best.len) best = { name, len: key.length };
  }
  return best ? best.name : trimmed;
}

/** Tashkilotchi o'z ro'yxatini kiritgan bo'lsa u, aks holda standart ro'yxat. */
export function centersFor(custom: unknown): string[] {
  if (Array.isArray(custom)) {
    const list = custom.map((c) => String(c).trim()).filter((c) => c.length > 0 && c.length <= 120);
    if (list.length) return list.slice(0, 200);
  }
  return DEFAULT_CENTERS;
}

/** Botdagi bir sahifada nechta markaz ko'rsatiladi. */
export const CENTERS_PER_PAGE = 10;
