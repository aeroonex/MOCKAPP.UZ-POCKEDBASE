"use client";

import React, { useState, useEffect, useCallback } from "react";
import JournalEntryForm from "@/components/JournalEntryForm";
import MoodEntryCard from "@/components/MoodEntryCard";
import { CefrCentreFooter } from "@/components/CefrCentreFooter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showError, showSuccess } from "@/utils/toast";
import { getLocalMoodEntries, addLocalMoodEntry, deleteLocalMoodEntry } from "@/lib/local-db";
import Navbar from "@/components/Navbar";
import { useTranslation } from 'react-i18next';

interface MoodEntry {
  id: string;
  mood: string;
  text: string;
  date: string;
}

const MoodJournal: React.FC = () => {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [filterMood, setFilterMood] = useState<string>("All");
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  const moods = [
    { label: t("mood_journal_page.all_moods"), value: "All" },
    { label: t("mood_journal_page.happy"), value: "Happy" },
    { label: t("mood_journal_page.neutral"), value: "Neutral" },
    { label: t("mood_journal_page.sad"), value: "Sad" },
    { label: t("mood_journal_page.anxious"), value: "Anxious" },
    { label: t("mood_journal_page.angry"), value: "Angry" },
  ];

  const fetchEntries = useCallback(() => {
    setIsLoading(true);
    try {
      const data = getLocalMoodEntries();
      setEntries(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error: any) {
      showError(`${t("mood_journal_page.error_loading_entries")} ${error.message}`);
    }
    setIsLoading(false);
  }, [t]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleAddEntry = (mood: string, text: string) => {
    try {
      addLocalMoodEntry({ mood, text });
      fetchEntries();
    } catch (error: any) {
      showError(`${t("mood_journal_page.error_saving_entry")} ${error.message}`);
    }
  };

  const handleDeleteEntry = (id: string) => {
    try {
      deleteLocalMoodEntry(id);
      showSuccess(t("mood_journal_page.success_entry_deleted"));
      setEntries((prevEntries) => prevEntries.filter((entry) => entry.id !== id));
    } catch (error: any) {
      showError(`${t("mood_journal_page.error_deleting_entry")} ${error.message}`);
    }
  };

  const filteredEntries = entries.filter((entry) =>
    filterMood === "All" ? true : entry.mood === filterMood,
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto p-4 max-w-3xl">
        <h1 className="text-4xl font-bold text-center mb-8">{t("mood_journal_page.mood_journal_tracker")}</h1>
        <div className="mb-8">
          <JournalEntryForm onAddEntry={handleAddEntry} />
        </div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">{t("mood_journal_page.your_past_entries")}</h2>
          <Select value={filterMood} onValueChange={setFilterMood}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("mood_journal_page.filter_by_mood")} />
            </SelectTrigger>
            <SelectContent>
              {moods.map((mood) => (
                <SelectItem key={mood.value} value={mood.value}>
                  {mood.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isLoading ? <p className="text-center">{t("common.loading")}</p> : filteredEntries.length === 0 ? (
          <p className="text-center text-muted-foreground">
            {filterMood === "All" ? t("mood_journal_page.no_entries_yet") : t("mood_journal_page.no_mood_entries_found", { mood: filterMood })}
          </p>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <MoodEntryCard key={entry.id} entry={entry} onDelete={handleDeleteEntry} />
            ))}
          </div>
        )}
      </main>
      <CefrCentreFooter />
    </div>
  );
};

export default MoodJournal;