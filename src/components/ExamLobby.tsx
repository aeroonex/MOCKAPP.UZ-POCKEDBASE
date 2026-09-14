"use client";

import React from "react";
import { useTranslation } from "react-i18next";

// Imtihon qismlari — faqat nom, mazmun va vaqt. Minimal ko'rinish.
const PARTS = [
  { key: "1_1", label: "Part 1.1" },
  { key: "1_2", label: "Part 1.2" },
  { key: "2", label: "Part 2" },
  { key: "3", label: "Part 3" },
] as const;

/** Sinov testi boshlanishidan oldingi qisqa ma'lumot: 4 qism va ularning vaqti. */
const ExamLobby: React.FC = () => {
  const { t } = useTranslation();

  return (
    <ol className="grid grid-cols-2 gap-x-4 gap-y-5 border-y border-border py-5 sm:grid-cols-4 sm:gap-x-0 sm:gap-y-0 sm:divide-x sm:divide-border">
      {PARTS.map((p) => (
        <li key={p.key} className="sm:px-5 sm:first:pl-0 sm:last:pr-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{p.label}</p>
          <p className="mt-1 text-[15px] font-semibold text-foreground">{t(`mock_test_page.part_${p.key}_desc`)}</p>
          <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">{t(`mock_test_page.part_${p.key}_meta`)}</p>
        </li>
      ))}
    </ol>
  );
};

export default ExamLobby;
