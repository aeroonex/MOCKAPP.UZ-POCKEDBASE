/**
 * Statistika (Ro'yxat → Statistika, admin → Hisobot) + chiroyli PDF hisobot.
 */
import { api } from "@/lib/api";
import { format } from "date-fns";

export interface GroupRow {
  name: string;
  total: number;
  approved: number;
  with_speaking: number;
  published: number;
  avg_overall: number | null;
  /** Ko'nikmalar bo'yicha o'rtachalar (hisobot aniqroq bo'lishi uchun) */
  avg_listening?: number | null;
  avg_reading?: number | null;
  avg_writing?: number | null;
  avg_speaking?: number | null;
  revenue: number;
  c1: number;
  b2: number;
  b1: number;
  a2: number;
}

/** Statistikada markaz/ustoz ochilganda ko'rinadigan o'quvchi */
export interface StudentRow {
  id: string;
  seq: number;
  full_name: string;
  phone: string;
  center_name: string;
  teacher_name: string;
  status: "pending" | "approved" | "rejected";
  listening: number | null;
  reading: number | null;
  writing: number | null;
  speaking: number | null;
  skip_listening: boolean;
  skip_reading: boolean;
  skip_writing: boolean;
  skip_speaking: boolean;
  overall: number | null;
  has_speaking: boolean;
  attempts: number;
  attempt_limit: number;
  amount: number;
  archived: boolean;
  published: boolean;
  created: string;
}

/** CEFR Multilevel (75) darajasi */
export function levelOf(overall: number | null | undefined): string | null {
  if (overall === null || overall === undefined) return null;
  if (overall >= 65) return "C1";
  if (overall >= 51) return "B2";
  if (overall >= 38) return "B1";
  return "A2";
}

export interface StatsTotals {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  free_count: number;
  revenue: number;
  with_speaking: number;
  published: number;
  archived: number;
  avg_overall: number | null;
  avg_listening: number | null;
  avg_reading: number | null;
  avg_writing: number | null;
  avg_speaking: number | null;
  avg_attempts: number | null;
  attempts_exhausted: number;
}

export interface Stats {
  range: { from: string | null; to: string | null };
  totals: StatsTotals;
  levels: { C1: number; B2: number; B1: number; A2: number };
  daily: { day: string; total: number; approved: number; speaking: number }[];
  by_center: GroupRow[];
  by_teacher: GroupRow[];
  /** Markaz ichidagi ustozlar (markaz ustiga bosilganda ochiladi) */
  by_center_teacher?: (GroupRow & { center: string })[];
  by_organizer?: (Omit<GroupRow, "c1" | "b2" | "b1" | "a2"> & { user_id: string; organizer: string; email: string })[];
}

export type RangePreset = "today" | "7d" | "30d" | "month" | "prev_month" | "all" | "custom";

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

/** Preset → from/to (Toshkent emas, brauzer sanasi — kunlik granulyarlik uchun yetarli) */
export function presetRange(p: RangePreset): { from?: string; to?: string } {
  const now = new Date();
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  switch (p) {
    case "today": return { from: ymd(now), to: ymd(now) };
    case "7d": return { from: ymd(new Date(start(now).getTime() - 6 * 86400000)), to: ymd(now) };
    case "30d": return { from: ymd(new Date(start(now).getTime() - 29 * 86400000)), to: ymd(now) };
    case "month": return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now) };
    case "prev_month": {
      const f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const t = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: ymd(f), to: ymd(t) };
    }
    default: return {};
  }
}

const qs = (r: { from?: string; to?: string }) => {
  const p = new URLSearchParams();
  if (r.from) p.set("from", r.from);
  if (r.to) p.set("to", r.to);
  const s = p.toString();
  return s ? `?${s}` : "";
};

/** Markaz/ustoz kesimi uchun so'rov satri */
const studentsQs = (f: { from?: string; to?: string; center?: string; teacher?: string; limit?: number }) => {
  const p = new URLSearchParams();
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.center !== undefined) p.set("center", f.center);
  if (f.teacher !== undefined) p.set("teacher", f.teacher);
  if (f.limit) p.set("limit", String(f.limit));
  const s = p.toString();
  return s ? `?${s}` : "";
};

export interface StudentsFilter {
  from?: string;
  to?: string;
  center?: string;
  teacher?: string;
  /** Eng ko'p nechta o'quvchi (server chegarasi 500) */
  limit?: number;
}

export const statsApi = {
  organizer: (r: { from?: string; to?: string }) => api.get<Stats>(`/api/registrations/stats${qs(r)}`),
  admin: (r: { from?: string; to?: string }) => api.get<Stats>(`/api/admin/stats/report${qs(r)}`),
  /** Markaz yoki ustozning o'quvchilari */
  students: (mode: "organizer" | "admin", f: StudentsFilter) =>
    api.get<{ items: StudentRow[]; limit: number }>(
      `${mode === "admin" ? "/api/admin/stats/students" : "/api/registrations/stats/students"}${studentsQs(f)}`,
    ),
};

export const fmtSum = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const fmtDate = (s: string | null | undefined) => (s ? format(new Date(s + "T00:00:00"), "dd.MM.yyyy") : "");

let fontCache: { reg: string; bold: string } | null = null;
async function b64(url: string): Promise<string> {
  const res = await fetch(url);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export interface ReportOptions {
  title: string; // "CEFR CENTRE — Statistik hisobot"
  subtitle?: string;
  labels: Record<string, string>; // tarjimalar
}

/**
 * Chiroyli A4 PDF hisobot: sarlavha bloki, KPI kartalar, kunlik grafik, daraja taqsimoti,
 * ko'nikma o'rtachalari, markazlar/ustozlar (yoki tashkilotchilar) jadvallari.
 */
export async function downloadStatsPdf(stats: Stats, opts: ReportOptions, students?: StudentRow[]): Promise<void> {
  const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = autoTableMod.default;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  if (!fontCache) fontCache = { reg: await b64("/fonts/DejaVuSans.ttf"), bold: await b64("/fonts/DejaVuSans-Bold.ttf") };
  doc.addFileToVFS("DejaVuSans.ttf", fontCache.reg);
  doc.addFont("DejaVuSans.ttf", "DejaVu", "normal");
  doc.addFileToVFS("DejaVuSans-Bold.ttf", fontCache.bold);
  doc.addFont("DejaVuSans-Bold.ttf", "DejaVu", "bold");
  doc.setFont("DejaVu", "normal");

  const L = opts.labels;
  const W = 210;
  const M = 12;
  const T = stats.totals;
  const period = stats.range.from || stats.range.to ? `${fmtDate(stats.range.from) || "…"} — ${fmtDate(stats.range.to) || "…"}` : L.all_time;

  // ---- Sarlavha bloki (gradient o'rnida ikki rangli panel)
  doc.setFillColor(67, 56, 202); // indigo-700
  doc.rect(0, 0, W, 34, "F");
  doc.setFillColor(124, 58, 237); // violet-600
  doc.rect(W * 0.55, 0, W * 0.45, 34, "F");
  doc.setTextColor(255);
  doc.setFont("DejaVu", "bold");
  doc.setFontSize(17);
  doc.text(opts.title, M, 14);
  doc.setFont("DejaVu", "normal");
  doc.setFontSize(10);
  doc.text(`${L.period}: ${period}`, M, 22);
  doc.text(`${L.generated}: ${format(new Date(), "dd.MM.yyyy HH:mm")}`, M, 28);
  if (opts.subtitle) doc.text(opts.subtitle, W - M, 22, { align: "right" });

  // ---- KPI kartalar (2 qator × 4)
  const kpis: [string, string][] = [
    [L.total, String(T.total)],
    [L.approved, String(T.approved)],
    [L.with_speaking, String(T.with_speaking)],
    [L.published, String(T.published)],
    [L.avg_overall, T.avg_overall === null ? "—" : String(T.avg_overall)],
    [L.revenue, `${fmtSum(T.revenue)} ${L.sum}`],
    [L.pending, String(T.pending)],
    [L.rejected, String(T.rejected)],
  ];
  let y = 42;
  const cw = (W - M * 2 - 3 * 3) / 4;
  kpis.forEach((k, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = M + col * (cw + 3);
    const yy = y + row * 20;
    doc.setFillColor(245, 243, 255);
    doc.setDrawColor(221, 214, 254);
    doc.roundedRect(x, yy, cw, 17, 2, 2, "FD");
    doc.setTextColor(79, 70, 229);
    doc.setFont("DejaVu", "bold");
    doc.setFontSize(13);
    doc.text(k[1], x + 4, yy + 8);
    doc.setTextColor(100);
    doc.setFont("DejaVu", "normal");
    doc.setFontSize(7.5);
    doc.text(doc.splitTextToSize(k[0], cw - 8)[0] as string, x + 4, yy + 13.5);
  });
  y += 44;

  // ---- Ko'nikma o'rtachalari + daraja taqsimoti (yonma-yon)
  const half = (W - M * 2 - 6) / 2;
  const boxH = 46;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(M, y, half, boxH, 2, 2, "FD");
  doc.roundedRect(M + half + 6, y, half, boxH, 2, 2, "FD");
  doc.setTextColor(30);
  doc.setFont("DejaVu", "bold");
  doc.setFontSize(10);
  doc.text(L.skills, M + 4, y + 7);
  doc.text(L.levels, M + half + 10, y + 7);
  doc.setFont("DejaVu", "normal");
  doc.setFontSize(8.5);
  const skills: [string, number | null][] = [["Listening", T.avg_listening], ["Reading", T.avg_reading], ["Writing", T.avg_writing], ["Speaking", T.avg_speaking]];
  const maxScore = 75;
  skills.forEach(([name, v], i) => {
    const yy = y + 14 + i * 8;
    doc.setTextColor(60);
    doc.text(name, M + 4, yy + 3);
    const bx = M + 26;
    const bw = half - 34;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(bx, yy, bw, 4, 1, 1, "F");
    if (v !== null) {
      doc.setFillColor(99, 102, 241);
      doc.roundedRect(bx, yy, Math.max(1, (Math.min(v, maxScore) / maxScore) * bw), 4, 1, 1, "F");
    }
    doc.setTextColor(30);
    doc.text(v === null ? "—" : String(v), bx + bw + 2, yy + 3.2);
  });
  const lv: [string, number, [number, number, number]][] = [["C1", stats.levels.C1, [16, 185, 129]], ["B2", stats.levels.B2, [14, 165, 233]], ["B1", stats.levels.B1, [245, 158, 11]], ["A2", stats.levels.A2, [244, 63, 94]]];
  const lvTotal = lv.reduce((a, b) => a + b[1], 0) || 1;
  lv.forEach(([name, n, c], i) => {
    const yy = y + 14 + i * 8;
    const bx = M + half + 10;
    doc.setFillColor(c[0], c[1], c[2]);
    doc.roundedRect(bx, yy, 8, 4, 1, 1, "F");
    doc.setTextColor(30);
    doc.text(`${name}`, bx + 10, yy + 3.2);
    const bw = half - 44;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(bx + 20, yy, bw, 4, 1, 1, "F");
    doc.setFillColor(c[0], c[1], c[2]);
    if (n > 0) doc.roundedRect(bx + 20, yy, Math.max(1, (n / lvTotal) * bw), 4, 1, 1, "F");
    doc.text(`${n} (${Math.round((n / lvTotal) * 100)}%)`, bx + 22 + bw, yy + 3.2);
  });
  y += boxH + 8;

  // ---- Kunlik grafik (ustunlar)
  if (stats.daily.length > 1) {
    const gh = 34;
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(M, y, W - M * 2, gh + 12, 2, 2, "D");
    doc.setFont("DejaVu", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30);
    doc.text(L.daily, M + 4, y + 7);
    const days = stats.daily.slice(-60);
    const gx = M + 6;
    const gw = W - M * 2 - 12;
    const gy = y + 10;
    const maxV = Math.max(1, ...days.map((d) => d.total));
    const bw = Math.min(8, (gw / days.length) * 0.7);
    const step = gw / days.length;
    doc.setFont("DejaVu", "normal");
    doc.setFontSize(6);
    days.forEach((d, i) => {
      const h = (d.total / maxV) * gh;
      const x = gx + i * step + (step - bw) / 2;
      doc.setFillColor(199, 210, 254);
      doc.rect(x, gy + gh - h, bw, h, "F");
      const ha = (d.approved / maxV) * gh;
      doc.setFillColor(99, 102, 241);
      doc.rect(x, gy + gh - ha, bw, ha, "F");
      if (days.length <= 31 || i % Math.ceil(days.length / 15) === 0) {
        doc.setTextColor(120);
        doc.text(d.day.slice(5).replace("-", "."), x + bw / 2, gy + gh + 3.5, { align: "center" });
      }
      if (d.total > 0 && days.length <= 31) {
        doc.setTextColor(60);
        doc.text(String(d.total), x + bw / 2, gy + gh - h - 1, { align: "center" });
      }
    });
    y += gh + 20;
  }

  // ---- Jadvallar
  const skillAvgs = (r: GroupRow) =>
    [r.avg_listening, r.avg_reading, r.avg_writing, r.avg_speaking].map((v) => (v === null || v === undefined ? "—" : v)).join(" / ");

  /**
   * Guruh jadvali. `children` berilsa har bir guruh ostida ichki qatorlar chiqadi
   * (markaz -> ustozlari) — hisobot aniqroq bo'ladi.
   */
  const groupTable = (title: string, rows: GroupRow[], nameLabel: string, children?: (name: string) => GroupRow[]) => {
    if (!rows.length) return;
    if (y > 240) {
      doc.addPage();
      y = 16;
    }
    doc.setFont("DejaVu", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30);
    doc.text(title, M, y + 4);
    const body: (string | number)[][] = [];
    const subIdx = new Set<number>();
    for (const r of rows) {
      body.push([r.name, r.total, r.approved, r.with_speaking, r.published, r.avg_overall ?? "—", skillAvgs(r), `${r.c1}/${r.b2}/${r.b1}/${r.a2}`, fmtSum(r.revenue)]);
      for (const k of children?.(r.name) ?? []) {
        subIdx.add(body.length);
        body.push([`   ↳ ${k.name}`, k.total, k.approved, k.with_speaking, k.published, k.avg_overall ?? "—", skillAvgs(k), `${k.c1}/${k.b2}/${k.b1}/${k.a2}`, fmtSum(k.revenue)]);
      }
    }
    autoTable(doc, {
      startY: y + 7,
      margin: { left: M, right: M },
      styles: { font: "DejaVu", fontSize: 7.5, cellPadding: 1.8, textColor: 30, halign: "center", valign: "middle" },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold", fontSize: 6.5, halign: "center" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      head: [[nameLabel, L.total_short, L.approved_short, L.speaking_short, L.published_short, L.avg_overall_short, L.skills_avg, "C1/B2/B1/A2", L.revenue]],
      body,
      didParseCell: (d) => {
        if (d.section === "body" && subIdx.has(d.row.index)) {
          d.cell.styles.fontSize = 6.8;
          d.cell.styles.textColor = 90;
          d.cell.styles.fillColor = [241, 245, 249];
        }
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: "bold", halign: "left" },
        1: { cellWidth: 12 }, 2: { cellWidth: 16 }, 3: { cellWidth: 15 }, 4: { cellWidth: 16 }, 5: { cellWidth: 14 },
        6: { cellWidth: 28 }, 7: { cellWidth: 22 },
        8: { halign: "right" },
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  };
  groupTable(L.by_center, stats.by_center, L.center, (center) =>
    (stats.by_center_teacher ?? []).filter((r) => r.center === center),
  );
  groupTable(L.by_teacher, stats.by_teacher, L.teacher);
  if (stats.by_organizer?.length) {
    if (y > 240) {
      doc.addPage();
      y = 16;
    }
    doc.setFont("DejaVu", "bold");
    doc.setFontSize(11);
    doc.text(L.by_organizer, M, y + 4);
    autoTable(doc, {
      startY: y + 7,
      margin: { left: M, right: M },
      styles: { font: "DejaVu", fontSize: 8, cellPadding: 2, textColor: 30, halign: "center", valign: "middle" },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold", fontSize: 7, halign: "center" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      head: [[L.organizer, "Email", L.total_short, L.approved_short, L.speaking_short, L.published_short, L.avg_overall_short, L.revenue]],
      body: stats.by_organizer.map((o) => [o.organizer, o.email, o.total, o.approved, o.with_speaking, o.published, o.avg_overall ?? "—", fmtSum(o.revenue)]),
      columnStyles: {
        0: { cellWidth: 40, fontStyle: "bold", halign: "left" }, 1: { cellWidth: 44, halign: "left" },
        2: { cellWidth: 14 }, 3: { cellWidth: 20 }, 4: { cellWidth: 18 }, 5: { cellWidth: 20 }, 6: { cellWidth: 16 },
        7: { halign: "right" },
      },
    });
  }

  // ---- Ilova: o'quvchilar ro'yxati (ism, markaz, ustoz, ballar, daraja)
  if (students?.length) {
    doc.addPage();
    y = 16;
    doc.setFont("DejaVu", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30);
    doc.text(`${L.student_list} (${students.length})`, M, y + 4);
    autoTable(doc, {
      startY: y + 7,
      margin: { left: M, right: M },
      styles: { font: "DejaVu", fontSize: 7.5, cellPadding: 1.6, textColor: 30, halign: "center", valign: "middle" },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold", fontSize: 6.5, halign: "center" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      head: [["#", L.student, L.center, L.teacher, "L", "R", "W", "S", L.avg_overall_short, L.level]],
      body: students.map((s) => [
        s.seq,
        s.full_name,
        s.center_name || "—",
        s.teacher_name || "—",
        s.skip_listening ? "✗" : (s.listening ?? "—"),
        s.skip_reading ? "✗" : (s.reading ?? "—"),
        s.skip_writing ? "✗" : (s.writing ?? "—"),
        s.skip_speaking ? "✗" : (s.speaking ?? "—"),
        s.overall ?? "—",
        levelOf(s.overall) ?? "—",
      ]),
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 42, halign: "left", fontStyle: "bold" },
        2: { cellWidth: 32, halign: "left" },
        3: { cellWidth: 30, halign: "left" },
        4: { cellWidth: 9 }, 5: { cellWidth: 9 }, 6: { cellWidth: 9 }, 7: { cellWidth: 9 },
        8: { cellWidth: 14, fontStyle: "bold" },
        9: { cellWidth: 12 },
      },
    });
  }

  // ---- Sahifa raqami / footer
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("DejaVu", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(140);
    doc.text(`edumock.uz · ${opts.title}`, M, 292);
    doc.text(`${p} / ${pages}`, W - M, 292, { align: "right" });
  }
  doc.save(`hisobot-${stats.range.from || "all"}-${stats.range.to || "all"}.pdf`);
}
