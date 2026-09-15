import { norm } from "./centers.js";

/**
 * O'quv markazlarning USTOZLAR ro'yxati va nomlarni birxillashtirish.
 *
 * Muammo: o'quvchilar ustoz nomini qo'lda yozganda bitta ustoz 6 xil yozilardi —
 * "Murodjon", "murodjon", "Murod", "Murodjon Mamurdjonov", "Murodjon Ma'murjonov"...
 * Yechim: Younine Academy va CEFR Centre ni tanlagan o'quvchiga ustozni TUGMALARDAN
 * tanlatamiz (har sahifada 10 ta), eski yozuvlarni esa shu yerdagi taqqoslash bilan
 * bitta kanonik nomga keltiramiz. Boshqa markazlarga bu ro'yxat ko'rinmaydi.
 */

/** Younine Academy va CEFR Centre ustozlari (markaz tizimidan olingan ro'yxat). */
const ROSTER = [
  "Samandar Abdurasulov",
  "Ozoda Rashidova",
  "Islombek Ubaydullayev",
  "Gulfiza",
  "Komila Odiljonova",
  "Muhammadshukur Rashidov",
  "Mohinur",
  "Shodiyona",
  "Biloliddin Usmonjonov",
  "Tohirjon Azamjonov",
  "Umar aka",
  "Muhammadyor Odiljonov",
  "Diyora Akbarova",
  "Madina Ruziyeva",
  "Xudoyberdi",
  "Davlatbek",
  "Mubina",
  "Mirzohid Ashuraliyev",
  "Mumtoz",
  "Marjona",
  "Malika",
  "Hushnoza",
  "Abdulaziz",
  "Mashhura",
  "Dilshod",
  "Erkinjon",
  "Muhsinbek",
  "Sevinch",
  "Omina",
  "Hojiakbar",
  "Murodjon",
  "Muhriddin",
];

/** Ustozlar ro'yxati ko'rinadigan markazlar (boshqalarda ustoz qo'lda yoziladi). */
export const CENTERS_WITH_ROSTER = ["Younine Academy", "CEFR Centre"];

/** Qo'lda yozilgan variantlar -> kanonik nom (norm() ko'rinishidagi kalitlar). */
const ALIASES: Record<string, string> = {
  murod: "Murodjon",
  murodjonmamurjonov: "Murodjon",
  murodjonmamurdjonov: "Murodjon",
  mamurjonovmurodjon: "Murodjon",
  muxsinjon: "Muhsinbek",
  muxsinbek: "Muhsinbek",
  muhsinqosimov: "Muhsinbek",
  muxsinjonqosimov: "Muhsinbek",
  muxsinbekqosimov: "Muhsinbek",
  innatullayevhudoyberdi: "Xudoyberdi",
  innatullayevxudoyberdi: "Xudoyberdi",
  hudoyberdi: "Xudoyberdi",
  marjonabakirovna: "Marjona",
  marjonbakirova: "Marjona",
  marjonabakirova: "Marjona",
  madina: "Madina Ruziyeva",
  madinaroziyeva: "Madina Ruziyeva",
  madinaruziyeva: "Madina Ruziyeva",
  ruziyevamadina: "Madina Ruziyeva",
  akbarovadiyora: "Diyora Akbarova",
  diyora: "Diyora Akbarova",
  mirzohid: "Mirzohid Ashuraliyev",
  ashuraliyevmirzohid: "Mirzohid Ashuraliyev",
  muhriddinustoz: "Muhriddin",
  muhriddinmuxtorov: "Muhriddin",
  odilovhojakbar: "Hojiakbar",
  hojakbar: "Hojiakbar",
  marifjonovashodiyona: "Shodiyona",
  shodiyonamarifjonova: "Shodiyona",
  davlatbekxudoyorov: "Davlatbek",
  xudoyorovdavlatbek: "Davlatbek",
};

/** Ikki satr orasidagi tahrirlash masofasi (kichik xatolar uchun). */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 99;
  const prev = new Array<number>(b.length + 1);
  const cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

/** Nomni so'zlarga ajratadi (kirill ham lotinga o'giriladi). */
function words(s: string): string[] {
  return s
    .split(/[\s.,\-/]+/)
    .map((w) => norm(w))
    .filter((w) => w.length > 1);
}

/** So'zlar tartibidan qat'i nazar bir xil bo'lsa mos keladi ("Akbarova Diyora" = "Diyora Akbarova"). */
export function wordKey(s: string): string {
  return words(s).sort().join("");
}

/**
 * Kichik xato bilan mos keladimi? Birinchi harf bir xil bo'lishi SHART —
 * aks holda "Zuhriddin" va "Muhriddin" (masofa 1) bitta odam bo'lib qolardi.
 */
function nearlySame(a: string, b: string, limit: number): boolean {
  if (!a || !b || a[0] !== b[0]) return false;
  return editDistance(a, b) <= limit;
}

/** Markaz uchun ustozlar ro'yxati (tashkilotchi o'zi kiritgan bo'lsa — u). */
export function teachersFor(center: string, custom?: unknown): string[] {
  if (custom && typeof custom === "object" && !Array.isArray(custom)) {
    const own = (custom as Record<string, unknown>)[center];
    if (Array.isArray(own)) {
      const list = own.map((t) => String(t).trim()).filter((t) => t.length > 1 && t.length <= 120);
      if (list.length) return list.slice(0, 300);
    }
  }
  return CENTERS_WITH_ROSTER.includes(center) ? ROSTER : [];
}

/** Har bir so'zni katta harf bilan boshlash: "murodjon mamurjonov" -> "Murodjon Mamurjonov" */
function titleCase(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()))
    .join(" ");
}

/**
 * Yozilgan ustoz nomini ro'yxatdagi kanonik nomga keltiradi.
 * Ro'yxatda topilmasa — chiroyli ko'rinishga keltirib o'zini qaytaradi (ma'lumot yo'qolmaydi).
 */
export function canonicalTeacher(raw: string, roster: string[] = ROSTER): string {
  const trimmed = (raw || "").trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const n = norm(trimmed);
  if (!n) return trimmed;

  // 1) aniq moslik
  for (const t of roster) if (norm(t) === n) return t;
  // 2) alias
  const alias = ALIASES[n];
  if (alias) return alias;
  // 3) so'zlar tartibi boshqa ("Akbarova Diyora")
  const wk = wordKey(trimmed);
  for (const t of roster) if (wordKey(t) === wk) return t;
  // 4) ichida bor ("Murodjon Mamurdjonov" -> "Murodjon")
  let contained: string | null = null;
  for (const t of roster) {
    const tn = norm(t);
    if (tn.length >= 5 && n.includes(tn) && (!contained || tn.length > norm(contained).length)) contained = t;
  }
  if (contained) return contained;
  // 5) so'zlardan biri ro'yxatdagi ism yoki familiyaga to'g'ri kelsa (yagona bo'lsa)
  const inWords = words(trimmed);
  const hits = roster.filter((t) => words(t).some((rw) => inWords.includes(rw)));
  if (hits.length === 1) return hits[0];
  // 6) kichik xato: butun nom bo'yicha (Diyorra, Hojakbar) — birinchi harf bir xil bo'lsa
  const limit = n.length >= 10 ? 2 : 1;
  const near = roster
    .map((t) => ({
      t,
      d: Math.min(
        nearlySame(n, norm(t), limit) ? editDistance(n, norm(t)) : 99,
        nearlySame(wk, wordKey(t), limit) ? editDistance(wk, wordKey(t)) : 99,
      ),
    }))
    .filter((x) => x.d <= limit)
    .sort((a, b) => a.d - b.d);
  if (near.length && (near.length === 1 || near[0].d < near[1].d)) return near[0].t;
  // 7) kichik xato: so'z darajasida ("Shdiyona" -> "Shodiyona", "Xudoyverdi" -> "Xudoyberdi")
  const wordNear = roster.filter((t) => {
    const rws = words(t);
    return rws.some((rw) => rw.length >= 6 && inWords.some((iw) => nearlySame(iw, rw, 1)));
  });
  if (wordNear.length === 1) return wordNear[0];

  return titleCase(trimmed);
}

/** Botdagi bir sahifada nechta ustoz ko'rsatiladi. */
export const TEACHERS_PER_PAGE = 10;
