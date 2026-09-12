"use client";

import React from "react";
import { Cloud, Mic, Pencil, Play, Trash2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/* Landing'dagi mahsulot ko'rinishlari — rasm emas, haqiqiy HTML/CSS. Ilova UI'siga mos, yengil. */

const Window: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={cn("overflow-hidden rounded-xl border border-white/10 bg-[#111318] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)]", className)}>
    <div className="flex items-center gap-2 border-b border-white/[0.06] px-3.5 py-2.5">
      <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
      <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
      <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
      <span className="ml-3 truncate text-xs text-zinc-500">{title}</span>
    </div>
    {children}
  </div>
);

/** Sinov testi ekrani — Part 2, tayyorgarlik/javob taymeri, REC. */
export const TestScreenMock: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Window title="edumock.uz/mock-test">
      <div className="grid gap-0 md:grid-cols-[1fr_260px]">
        <div className="p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-sky-500/15 px-2 py-1 text-xs font-semibold text-sky-300">Part 2</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400">
              <span className="rec-dot h-2 w-2 rounded-full bg-red-500" /> REC 04:32
            </span>
          </div>
          <div className="mt-5 flex items-center gap-5">
            <div className="relative grid h-20 w-20 shrink-0 place-items-center">
              <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full -rotate-90">
                <circle cx="40" cy="40" r="35" stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" />
                <circle className="ring-anim" cx="40" cy="40" r="35" stroke="#0ea5e9" strokeWidth="6" fill="none" strokeDasharray="220" strokeDashoffset="70" strokeLinecap="round" />
              </svg>
              <span className="text-lg font-bold tabular-nums text-white">1:24</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">{t("add_question_page.answer")}</p>
              <p className="mt-1 text-base font-semibold text-white">{t("landing_page.mock_question")}</p>
            </div>
          </div>
          <div className="mt-5 overflow-hidden rounded-lg border border-white/[0.06] bg-[#0b0c10]">
            <img src="/images/placeholder-landscape.svg" alt="" className="aspect-[16/7] w-full object-cover opacity-90" loading="lazy" decoding="async" />
          </div>
          <div className="mt-4 flex items-end gap-1" aria-hidden="true">
            {[8, 14, 22, 12, 18, 26, 10, 16, 24, 14, 20, 9, 15, 23, 11, 17, 25, 13, 19, 8].map((h, i) => (
              <span key={i} className="wave-bar w-1.5 origin-bottom rounded-sm bg-sky-400/70" style={{ height: h, animationDelay: `${(i % 7) * 0.13}s` }} />
            ))}
            <Mic className="ml-2 h-4 w-4 text-zinc-500" />
          </div>
        </div>
        <aside className="border-t border-white/[0.06] p-5 md:border-l md:border-t-0">
          <p className="text-xs uppercase tracking-wider text-zinc-500">{t("mock_test_page.student_info_title")}</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-zinc-500">{t("mock_test_page.student_id")}</dt><dd className="font-medium text-white">2041</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-zinc-500">{t("mock_test_page.student_name")}</dt><dd className="font-medium text-white">Aziza K.</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-zinc-500">{t("mock_test_page.student_phone")}</dt><dd className="font-medium text-white">+998 90 ··· ··</dd></div>
          </dl>
          <div className="mt-5 space-y-1.5">
            {[
              ["Part 1.1", true],
              ["Part 1.2", true],
              ["Part 2", false],
              ["Part 3", false],
            ].map(([p, done]) => (
              <div key={p as string} className="flex items-center justify-between rounded-md border border-white/[0.06] px-2.5 py-1.5 text-xs">
                <span className={cn(done ? "text-zinc-400 line-through" : "text-white")}>{p as string}</span>
                <span className={cn("h-1.5 w-1.5 rounded-full", done ? "bg-emerald-400" : p === "Part 2" ? "bg-sky-400" : "bg-white/15")} />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </Window>
  );
};

/** Savollar bazasi — ro'yxat va tahrirlash. */
export const QuestionsMock: React.FC = () => {
  const { t } = useTranslation();
  const rows = [
    { part: "Part 1.1", text: "What do you usually do at the weekend?", used: t("add_question_page.not_used") },
    { part: "Part 1.2", text: "Describe the picture. What is happening?", used: "12.09" },
    { part: "Part 2", text: "Talk about a place you like to visit.", used: "11.09" },
    { part: "Part 3", text: "Is technology changing how people learn?", used: t("add_question_page.not_used") },
  ];
  return (
    <Window title="edumock.uz/add-question">
      <div className="p-4 sm:p-5">
        <div className="mb-3 flex gap-1 rounded-lg bg-[#0b0c10] p-1 text-xs">
          {["Part 1.1", "Part 1.2", "Part 2", "Part 3"].map((p, i) => (
            <span key={p} className={cn("flex-1 rounded-md px-2 py-1.5 text-center", i === 0 ? "bg-white/10 font-semibold text-white" : "text-zinc-500")}>{p}</span>
          ))}
        </div>
        <ul className="divide-y divide-white/[0.06]">
          {rows.map((r) => (
            <li key={r.text} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="w-14 shrink-0 text-xs text-zinc-500">{r.part}</span>
              <span className="flex-1 truncate text-zinc-200">{r.text}</span>
              <span className="hidden text-xs text-zinc-500 sm:inline">{r.used}</span>
              <Pencil className="h-3.5 w-3.5 text-zinc-500" />
              <Trash2 className="h-3.5 w-3.5 text-zinc-600" />
            </li>
          ))}
        </ul>
      </div>
    </Window>
  );
};

/** Yozuvlar — lokal + bulut. */
export const RecordingsMock: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Window title="edumock.uz/records">
      <div className="p-4 sm:p-5">
        <div className="rounded-lg border border-white/[0.06] bg-[#0b0c10] p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-white"><Cloud className="h-3.5 w-3.5 text-sky-400" /> EduCloud</span>
            <span className="text-zinc-500">1.2 GB / 2 GB</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full w-[60%] rounded-full bg-sky-500" />
          </div>
        </div>
        <ul className="mt-3 space-y-2">
          {[
            { name: "Aziza K.", when: "12.09 · 14:32", dur: "12:04", cloud: true },
            { name: "Bekzod T.", when: "12.09 · 13:10", dur: "11:48", cloud: false },
          ].map((r) => (
            <li key={r.name} className="flex items-center gap-3 rounded-lg border border-white/[0.06] px-3 py-2.5 text-sm">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/[0.06]"><Play className="h-3.5 w-3.5 text-white" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-white">{r.name}</span>
                <span className="block text-xs text-zinc-500">{r.when} · {r.dur}</span>
              </span>
              {r.cloud ? (
                <span className="text-xs text-emerald-400">{t("records_page.uploaded_to_cloud")}</span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-sky-500 px-2 py-1 text-xs font-semibold text-white"><Upload className="h-3 w-3" /> {t("records_page.upload")}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Window>
  );
};
