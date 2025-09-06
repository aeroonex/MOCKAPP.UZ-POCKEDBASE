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
import { supabase } from "@/lib/supabase";

interface MoodEntry {
  id: string; // uuid
  mood: string;
  text: string;
  date: string; // ISO string
}

const moods = [
  { label: "All Moods", value: "All" },
  { label: "Happy", value: "Happy" },
  { label: "Neutral", value: "Neutral" },
  { label: "Sad", value: "Sad" },
  { label: "Anxious", value: "Anxious" },
  { label: "Angry", value: "Angry" },
];

const MoodJournal: React.FC = () => {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [filterMood, setFilterMood] = useState<string>("All");
  const [isLoading, setIsLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('mood_entries')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      showError(`Yozuvlarni yuklashda xatolik: ${error.message}`);
    } else {
      setEntries(data as MoodEntry[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleAddEntry = async (mood: string, text: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("Yozuv qo'shish uchun tizimga kiring.");
      return;
    }

    const newEntry = { mood, text }; // id, date, user_id will be set by DB
    const { error } = await supabase.from('mood_entries').insert([newEntry]);

    if (error) {
      showError(`Yozuvni saqlashda xatolik: ${error.message}`);
    } else {
      // No need to show success toast here, JournalEntryForm already does
      fetchEntries(); // Refresh the list from DB
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const { error } = await supabase.from('mood_entries').delete().eq('id', id);
    if (error) {
      showError(`Yozuvni o'chirishda xatolik: ${error.message}`);
    } else {
      showSuccess("Yozuv muvaffaqiyatli o'chirildi!");
      setEntries((prevEntries) => prevEntries.filter((entry) => entry.id !== id));
    }
  };

  const filteredEntries = entries.filter((entry) =>
    filterMood === "All" ? true : entry.mood === filterMood,
  );

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-4xl font-bold text-center mb-8">Mood Journal & Tracker</h1>
      <div className="mb-8">
        <JournalEntryForm onAddEntry={handleAddEntry} />
      </div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Your Past Entries</h2>
        <Select value={filterMood} onValueChange={setFilterMood}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by mood" />
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
      {isLoading ? <p className="text-center">Yuklanmoqda...</p> : filteredEntries.length === 0 ? (
        <p className="text-center text-muted-foreground">
          {filterMood === "All" ? "Hali yozuvlar yo'q." : `"${filterMood}" yozuvlari topilmadi.`}
        </p>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <MoodEntryCard key={entry.id} entry={entry} onDelete={handleDeleteEntry} />
          ))}
        </div>
      )}
      <CefrCentreFooter />
    </div>
  );
};

export default MoodJournal;