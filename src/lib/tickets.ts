/**
 * A4 chiptalar (PDF): har bir o'quvchi alohida katakda — raqam, ism, telefon, QR kod, pastki matn.
 * 2 ustun × 8 qator = 16 ta chipta / sahifa; ko'p bo'lsa avtomatik yangi sahifa.
 * jsPDF va QR kutubxonalari faqat shu funksiya chaqirilganda yuklanadi (asosiy bundle og'irlashmaydi).
 */
import type { Registration, RegistrationSettings } from "@/lib/registrations";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 10;
const COLS = 2;
const ROWS = 8;
const CELL_W = (PAGE_W - MARGIN * 2) / COLS; // 95 mm
const CELL_H = (PAGE_H - MARGIN * 2) / ROWS; // ~34.6 mm
const QR_SIZE = 26;
const PAD = 3;

let fontCache: { reg: string; bold: string } | null = null;

async function fetchBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font ${url}: HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}

export interface TicketOptions {
  /** Pastki matn (masalan "@cefrcentreuz"); bo'sh bo'lsa markaz nomi */
  footer: string;
  /** QR kodga yoziladigan havola; bo'sh bo'lsa QR chizilmaydi */
  qrUrl: string;
  /** Fayl nomi (kengaytmasiz) */
  fileName?: string;
  /** Shrift fayllari manzili (sukut: joriy sayt) — test/Node uchun */
  fontBaseUrl?: string;
}

export function ticketDefaults(settings: RegistrationSettings | undefined): TicketOptions {
  return {
    footer: settings?.ticket_footer || settings?.center_name || "",
    qrUrl: settings?.ticket_qr_url || settings?.bot_link || "",
  };
}

/** Chiptalar PDF'ini yaratib, brauzerda yuklab olishni boshlaydi. Qaytadi: sahifalar soni. */
export async function downloadTicketsPdf(students: Registration[], opts: TicketOptions): Promise<number> {
  if (!students.length) return 0;
  const { doc, pages } = await buildTicketsPdf(students, opts);
  const date = new Date().toISOString().slice(0, 10);
  doc.save(`${opts.fileName || `chiptalar-${date}`}.pdf`);
  return pages;
}

/** PDF hujjatni yaratadi (saqlamasdan) — oldindan ko'rish/test uchun. */
export async function buildTicketsPdf(students: Registration[], opts: TicketOptions) {
  const [{ jsPDF }, QRCode] = await Promise.all([import("jspdf"), import("qrcode")]);

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  // Lotin (o'zbek apostroflari) + kirill uchun shrift (bir marta yuklanadi, keyin xotiradan)
  if (!fontCache) {
    const base = opts.fontBaseUrl ?? "";
    const [reg, bold] = await Promise.all([fetchBase64(`${base}/fonts/DejaVuSans.ttf`), fetchBase64(`${base}/fonts/DejaVuSans-Bold.ttf`)]);
    fontCache = { reg, bold };
  }
  doc.addFileToVFS("DejaVuSans.ttf", fontCache.reg);
  doc.addFont("DejaVuSans.ttf", "DejaVu", "normal");
  doc.addFileToVFS("DejaVuSans-Bold.ttf", fontCache.bold);
  doc.addFont("DejaVuSans-Bold.ttf", "DejaVu", "bold");

  const qrData = opts.qrUrl
    ? await QRCode.toDataURL(opts.qrUrl, { errorCorrectionLevel: "M", margin: 0, width: 300, color: { dark: "#000000", light: "#ffffff" } })
    : null;

  const perPage = COLS * ROWS;
  const pages = Math.ceil(students.length / perPage);

  students.forEach((s, i) => {
    const idx = i % perPage;
    if (i > 0 && idx === 0) doc.addPage();
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const x = MARGIN + col * CELL_W;
    const y = MARGIN + row * CELL_H;

    // Katak chegarasi (kesish uchun)
    doc.setDrawColor(0);
    doc.setLineWidth(0.25);
    doc.rect(x, y, CELL_W, CELL_H);

    const textX = x + PAD;
    const textW = CELL_W - PAD * 2 - (qrData ? QR_SIZE + PAD : 0);
    let ty = y + PAD + 4;

    // ID — tizimdagi tartib raqami (#002)
    doc.setFont("DejaVu", "bold");
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text(`#${String(s.seq).padStart(3, "0")}`, textX, ty);
    ty += 6;

    // Ism
    doc.setFont("DejaVu", "normal");
    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.text("Ism:", textX, ty);
    const ismW = doc.getTextWidth("Ism: ");
    doc.setFont("DejaVu", "bold");
    const name = doc.splitTextToSize(s.full_name, textW - ismW) as string[];
    doc.text(name.slice(0, 2), textX + ismW, ty);
    ty += 5.5 * Math.min(name.length, 2);

    // Telefon
    doc.setFont("DejaVu", "normal");
    doc.text("Raqam:", textX, ty);
    const raqamW = doc.getTextWidth("Raqam: ");
    doc.setFont("DejaVu", "bold");
    doc.text(s.phone, textX + raqamW, ty);
    ty += 5.5;

    // O'quv markaz (bo'lsa, kichik)
    if (s.center_name && ty < y + CELL_H - 8) {
      doc.setFont("DejaVu", "normal");
      doc.setFontSize(8);
      doc.setTextColor(90);
      doc.text(doc.splitTextToSize(s.center_name, textW)[0] as string, textX, ty);
      doc.setTextColor(0);
    }

    // QR (o'ng tomonda)
    if (qrData) {
      doc.addImage(qrData, "PNG", x + CELL_W - PAD - QR_SIZE, y + PAD, QR_SIZE, QR_SIZE);
    }

    // Pastki matn (qalin, o'ngga tekislangan)
    if (opts.footer) {
      doc.setFont("DejaVu", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0);
      const fx = qrData ? x + CELL_W - PAD - QR_SIZE - PAD : x + CELL_W - PAD;
      doc.text(opts.footer, fx, y + CELL_H - PAD - 1, { align: "right" });
    }
  });

  // Sahifa raqami
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("DejaVu", "normal");
    doc.setFontSize(7);
    doc.setTextColor(140);
    doc.text(`${p} / ${pages}`, PAGE_W - MARGIN, PAGE_H - 4, { align: "right" });
  }

  return { doc, pages };
}
