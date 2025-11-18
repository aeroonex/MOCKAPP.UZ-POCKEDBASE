"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import MoodSelector from "./MoodSelector";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from 'react-i18next';

interface JournalEntryFormProps {
  onAddEntry: (mood: string, text: string) => void;
}

const JournalEntryForm: React.FC<JournalEntryFormProps> = ({ onAddEntry }) => {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [journalText, setJournalText] = useState<string>("");
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMood) {
      showError(t("add_question_page.error_select_mood"));
      return;
    }
    if (!journalText.trim()) {
      showError(t("add_question_page.error_journal_empty"));
      return;
    }
    onAddEntry(selectedMood, journalText.trim());
    setSelectedMood(null);
    setJournalText("");
    showSuccess(t("add_question_page.success_mood_added"));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg shadow-sm bg-card">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t("mood_journal_page.how_are_you_feeling")}</h3>
        <MoodSelector
          selectedMood={selectedMood}
          onSelectMood={setSelectedMood}
        />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">{t("mood_journal_page.journal_entry")}</h3>
        <Textarea
          placeholder={t("mood_journal_page.write_about_your_day")}
          value={journalText}
          onChange={(e) => setJournalText(e.target.value)}
          rows={5}
          className="w-full"
        />
      </div>
      <Button type="submit" className="w-full">
        {t("mood_journal_page.add_entry")}
      </Button>
    </form>
  );
};

export default JournalEntryForm;