"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { showError } from "@/utils/toast";
import { useTranslation } from 'react-i18next';
import { Search, UserCheck, X, Loader2, Video } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { registrationsApi, formatSeq, type Registration } from "@/lib/registrations";
import { cn } from "@/lib/utils";

interface StudentInfoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (studentId: string, studentName: string, studentPhone: string, registrationId?: string) => void;
}

const StudentInfoForm: React.FC<StudentInfoFormProps> = ({ isOpen, onClose, onSave }) => {
  const [studentId, setStudentId] = useState<string>("");
  const [studentName, setStudentName] = useState<string>("");
  const [studentPhone, setStudentPhone] = useState<string>("");
  const { t } = useTranslation();
  const { user } = useAuth();

  // Ro'yxatdan qidirish (faqat tizimga kirgan foydalanuvchilar uchun)
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Registration[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Registration | null>(null);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setSelected(null);
      setOpen(false);
    }
  }, [isOpen]);

  // 2 belgidan boshlab, 250 ms kechikish bilan qidiradi
  useEffect(() => {
    if (!user || selected) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const id = setTimeout(async () => {
      try {
        const items = await registrationsApi.search(q);
        if (!cancelled) {
          setResults(items);
          setOpen(true);
          setHighlight(0);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query, user, selected]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (r: Registration) => {
    if (r.attempts_left <= 0) {
      showError(t("mock_test_page.attempts_exhausted", { n: r.attempt_limit }));
      return;
    }
    setSelected(r);
    setQuery("");
    setOpen(false);
    setStudentId(formatSeq(r.seq));
    setStudentName(r.full_name);
    setStudentPhone(r.phone);
  };

  const clearSelected = () => {
    setSelected(null);
    setStudentId("");
    setStudentName("");
    setStudentPhone("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || !results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(results[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const handleSubmit = () => {
    if (!studentId.trim() || !studentName.trim() || !studentPhone.trim()) {
      showError(t("add_question_page.error_fill_all_fields"));
      return;
    }
    onSave(studentId.trim(), studentName.trim(), studentPhone.trim(), selected?.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed left-[50%] top-[50%] z-[9999] w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-[460px] translate-x-[-50%] translate-y-[-50%] bg-background p-5 sm:p-6 shadow-lg rounded-lg max-h-[92vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>{t("mock_test_page.student_info_title")}</DialogTitle>
          <DialogDescription>
            {t("mock_test_page.student_info_description")}
          </DialogDescription>
        </DialogHeader>

        {user && (
          <div ref={boxRef} className="relative">
            {selected ? (
              <div className="flex items-center gap-3 rounded-lg border-2 border-emerald-400/70 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2.5">
                <div className="h-9 w-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">
                    <span className="font-mono text-muted-foreground mr-1">{formatSeq(selected.seq)}</span>
                    {selected.full_name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {selected.phone}
                    {selected.center_name ? ` · ${selected.center_name}` : ""}
                    {selected.speaking ? " · 🎥" : ""}
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5 flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    {t("mock_test_page.auto_upload_hint")}
                  </div>
                  <div className="text-[11px] mt-0.5 font-medium">
                    {t("mock_test_page.attempt_next", { n: selected.attempts + 1, limit: selected.attempt_limit })}
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={clearSelected} aria-label="clear">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Label htmlFor="studentSearch" className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("mock_test_page.search_registered")}
                </Label>
                <div className="relative mt-1">
                  {searching ? (
                    <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                  ) : (
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  )}
                  <Input
                    id="studentSearch"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => results.length && setOpen(true)}
                    onKeyDown={onKeyDown}
                    autoComplete="off"
                    placeholder={t("mock_test_page.search_registered_placeholder")}
                    className="pl-9 border-primary/40 focus-visible:ring-primary"
                  />
                </div>
                {open && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-xl max-h-64 overflow-auto">
                    {results.length === 0 ? (
                      <div className="px-3 py-3 text-sm text-muted-foreground">{t("mock_test_page.search_no_results")}</div>
                    ) : (
                      results.map((r, i) => (
                        <button
                          key={r.id}
                          type="button"
                          onMouseEnter={() => setHighlight(i)}
                          onClick={() => pick(r)}
                          className={cn(
                            "w-full text-left px-3 py-2 flex items-center gap-3 transition-colors",
                            i === highlight ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                            r.attempts_left <= 0 && "opacity-70 bg-red-50 dark:bg-red-950/30 cursor-not-allowed",
                          )}
                        >
                          <span className="font-mono text-xs text-muted-foreground w-11 shrink-0">{formatSeq(r.seq)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium truncate">{r.full_name}</span>
                            <span className="block text-xs text-muted-foreground truncate">
                              {r.phone}
                              {r.center_name ? ` · ${r.center_name}` : ""}
                              {r.teacher_name ? ` · 👨‍🏫 ${r.teacher_name}` : ""}
                            </span>
                          </span>
                          {r.attempts_left <= 0 ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white shrink-0 font-semibold">
                              ⛔ {t("mock_test_page.limit_reached")}
                            </span>
                          ) : (
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded shrink-0", r.attempts > 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200")}>
                              {r.speaking ? "🎥 " : ""}{t("mock_test_page.attempts_badge", { n: r.attempts, limit: r.attempt_limit })}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
                <div className="relative my-3 flex items-center">
                  <div className="flex-grow border-t" />
                  <span className="mx-3 text-[11px] uppercase tracking-wide text-muted-foreground">{t("mock_test_page.or_manual")}</span>
                  <div className="flex-grow border-t" />
                </div>
              </>
            )}
          </div>
        )}

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="studentId" className="text-right">
              {t("mock_test_page.student_id")}
            </Label>
            <Input
              id="studentId"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="col-span-3"
              placeholder={t("mock_test_page.student_id_placeholder")}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="studentName" className="text-right">
              {t("mock_test_page.student_name")}
            </Label>
            <Input
              id="studentName"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="col-span-3"
              placeholder={t("mock_test_page.student_name_placeholder")}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="studentPhone" className="text-right">
              {t("mock_test_page.student_phone")}
            </Label>
            <Input
              id="studentPhone"
              value={studentPhone}
              onChange={(e) => setStudentPhone(e.target.value)}
              className="col-span-3"
              placeholder={t("mock_test_page.student_phone_placeholder")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit}>
            {t("mock_test_page.start_test")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudentInfoForm;
