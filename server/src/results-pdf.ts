import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SKILLS,
  SKILL_LABEL,
  countedSkills,
  formatSeq,
  overallScore,
  skillScore,
  skillSkipped,
  type RegistrationWithSpeaking,
  type SettingsRow,
} from "./registrations.js";

/**
 * Natija varaqasi (A4 PDF): markaz sarlavhasi, o'quvchi, 4 ko'nikma bali, Overall + CEFR daraja,
 * Speaking video uchun QR, aloqa ma'lumoti. Unicode (DejaVu) shrift — kirill/lotin ismlar to'g'ri chiqadi.
 */

const FONT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", "fonts");
const FONT = path.join(FONT_DIR, "DejaVuSans.ttf");
const FONT_BOLD = path.join(FONT_DIR, "DejaVuSans-Bold.ttf");

const BLUE = "#1d4ed8";
const INK = "#0f172a";
const MUTED = "#64748b";
const LINE = "#e2e8f0";

/** CEFR Multilevel shkalasi (75 ballik): C1 ≥ 65, B2 ≥ 51, B1 ≥ 38 — mijoz bilan bir xil */
export function cefrLevel(overall: number | null): { label: string; color: string } {
  if (overall === null) return { label: "—", color: MUTED };
  if (overall >= 65) return { label: "C1", color: "#059669" };
  if (overall >= 51) return { label: "B2", color: "#0284c7" };
  if (overall >= 38) return { label: "B1", color: "#d97706" };
  return { label: "A2", color: "#e11d48" };
}

const fmtScore = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const pad2 = (n: number) => String(n).padStart(2, "0");
function fmtDateTashkent(d: Date): string {
  const t = new Date(d.getTime() + 5 * 60 * 60 * 1000); // UTC+5
  return `${pad2(t.getUTCDate())}.${pad2(t.getUTCMonth() + 1)}.${t.getUTCFullYear()}`;
}

export interface ResultPdfInput {
  reg: RegistrationWithSpeaking;
  settings: SettingsRow;
  /** Speaking videoning to'liq havolasi (QR uchun), bo'lmasa bo'sh */
  videoUrl?: string;
}

export async function buildResultPdf({ reg, settings, videoUrl }: ResultPdfInput): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: `Natija — ${reg.full_name}`, Author: settings.center_name || "Edumock.uz" } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.registerFont("R", FONT);
  doc.registerFont("B", FONT_BOLD);
  const W = doc.page.width;
  const M = 40;
  const innerW = W - M * 2;

  // ---- sarlavha bandi
  doc.rect(0, 0, W, 118).fill(BLUE);
  doc.fillColor("#ffffff").font("B").fontSize(20).text(settings.center_name || "O'quv markaz", M, 34, { width: innerW - 120, lineBreak: false, ellipsis: true });
  doc.font("R").fontSize(11).fillOpacity(0.9).text("CEFR Multilevel · Mock imtihon natijasi", M, 64);
  if (settings.exam_info) doc.fontSize(10).fillOpacity(0.85).text(settings.exam_info, M, 82, { width: innerW - 120, lineBreak: false, ellipsis: true });
  doc.fillOpacity(1).font("B").fontSize(12).text("edumock.uz", W - M - 100, 36, { width: 100, align: "right" });
  doc.font("R").fontSize(9).fillOpacity(0.85).text(fmtDateTashkent(new Date()), W - M - 100, 56, { width: 100, align: "right" });
  doc.fillOpacity(1);

  // ---- o'quvchi
  let y = 146;
  doc.fillColor(INK).font("B").fontSize(19).text(reg.full_name, M, y, { width: innerW, lineBreak: false, ellipsis: true });
  y += 28;
  const meta = [`№ ${formatSeq(reg.seq).replace(/^#/, "")}`, reg.phone, reg.center_name ? `Markaz: ${reg.center_name}` : "", reg.teacher_name ? `Ustoz: ${reg.teacher_name}` : ""].filter(Boolean);
  doc.fillColor(MUTED).font("R").fontSize(10.5).text(meta.join("   ·   "), M, y, { width: innerW, lineBreak: false, ellipsis: true });
  y += 30;

  // ---- ko'nikmalar jadvali
  doc.moveTo(M, y).lineTo(W - M, y).lineWidth(1).strokeColor(LINE).stroke();
  y += 6;
  doc.fillColor(MUTED).font("B").fontSize(9).text("KO'NIKMA", M, y + 4).text("BALL", W - M - 120, y + 4, { width: 120, align: "right" });
  y += 22;
  for (const k of SKILLS) {
    doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.5).strokeColor(LINE).stroke();
    const rowY = y + 10;
    doc.fillColor(INK).font("B").fontSize(12.5).text(SKILL_LABEL[k], M, rowY);
    if (skillSkipped(reg, k)) {
      doc.fillColor(MUTED).font("R").fontSize(11).text("— (topshirilmagan)", W - M - 200, rowY + 1, { width: 200, align: "right" });
    } else {
      const sc = skillScore(reg, k);
      doc.fillColor(INK).font("B").fontSize(15).text(sc === null ? "—" : fmtScore(sc), W - M - 120, rowY - 1, { width: 120, align: "right" });
    }
    y += 34;
  }
  doc.moveTo(M, y).lineTo(W - M, y).lineWidth(1).strokeColor(LINE).stroke();
  y += 18;

  // ---- Overall + daraja
  const overall = overallScore(reg);
  const lvl = cefrLevel(overall);
  const boxH = 86;
  doc.roundedRect(M, y, innerW, boxH, 10).fill("#eff6ff");
  doc.fillColor(MUTED).font("B").fontSize(9).text("OVERALL", M + 20, y + 16);
  doc.fillColor(INK).font("B").fontSize(38).text(overall === null ? "—" : String(overall), M + 20, y + 30);
  const counted = countedSkills(reg);
  const skipped = SKILLS.filter((k) => skillSkipped(reg, k));
  doc.fillColor(MUTED).font("R").fontSize(9).text(
    skipped.length ? `${counted.length} ta topshirilgan ko'nikma o'rtachasi (${skipped.map((k) => SKILL_LABEL[k]).join(", ")} hisobga olinmadi)` : "4 ta ko'nikma o'rtachasi · 75 ballik shkala",
    M + 110,
    y + 52,
    { width: innerW - 260, lineBreak: false, ellipsis: true },
  );
  // daraja belgisi
  const bw = 112;
  doc.roundedRect(W - M - 20 - bw, y + 18, bw, 50, 10).fill(lvl.color);
  doc.fillColor("#ffffff").font("B").fontSize(24).text(lvl.label, W - M - 20 - bw, y + 25, { width: bw, align: "center" });
  doc.font("R").fontSize(8.5).fillOpacity(0.9).text("CEFR daraja", W - M - 20 - bw, y + 53, { width: bw, align: "center" });
  doc.fillOpacity(1);
  y += boxH + 26;

  // ---- Speaking video QR
  if (videoUrl) {
    const png = await QRCode.toBuffer(videoUrl, { type: "png", width: 260, margin: 1, color: { dark: INK, light: "#ffffff" } });
    doc.image(png, M, y, { width: 104, height: 104 });
    doc.fillColor(INK).font("B").fontSize(12).text("Speaking videoni ko'rish", M + 120, y + 14);
    doc.fillColor(MUTED).font("R").fontSize(9.5).text("QR kodni skanerlang yoki havolani oching. Havola tashkilotchining serverida saqlanadi.", M + 120, y + 34, { width: innerW - 120 });
    doc.fillColor(BLUE).font("R").fontSize(8.5).text(videoUrl, M + 120, y + 66, { width: innerW - 120, lineBreak: false, ellipsis: true });
    y += 130;
  }

  // ---- pastki qism
  const footY = doc.page.height - 96;
  doc.moveTo(M, footY).lineTo(W - M, footY).lineWidth(1).strokeColor(LINE).stroke();
  if (settings.contact_info) doc.fillColor(INK).font("R").fontSize(10).text(`Aloqa: ${settings.contact_info}`, M, footY + 12, { width: innerW - 200, lineBreak: false, ellipsis: true });
  doc.fillColor(MUTED).font("R").fontSize(8.5).text(`Berilgan sana: ${fmtDateTashkent(new Date())} · Edumock.uz platformasi orqali tayyorlandi`, M, footY + 30, { width: innerW - 200, lineBreak: false, ellipsis: true });
  doc.fillColor(MUTED).font("R").fontSize(9).text("Mas'ul shaxs: ____________________", W - M - 200, footY + 18, { width: 200, align: "right" });

  doc.end();
  return done;
}
