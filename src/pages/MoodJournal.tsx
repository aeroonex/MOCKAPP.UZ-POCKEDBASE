"use client";

import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import JournalEntryForm from "@/components/JournalEntryForm";
import MoodEntryCard from "@/components/MoodEntryCard";
import { MadeWithDyad } from "@/components/made-with-dyad";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showError, showSuccess } from "@/utils/toast";

interface MoodEntry {
  id: string;
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

  useEffect(() => {
    const storedEntries = localStorage.getItem("moodJournalEntries");
    if (storedEntries) {
      setEntries(JSON.parse(storedEntries));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("moodJournalEntries", JSON.stringify(entries));
  }, [entries]);

  const handleAddEntry = (mood: string, text: string) => {
    const newEntry: MoodEntry = {
      id: uuidv4(),
      mood,
      text,
      date: new Date().toISOString(),
    };
    setEntries((prevEntries) => [newEntry, ...prevEntries]);
  };

  const handleDeleteEntry = (id: string) => {
    setEntries((prevEntries) => prevEntries.filter((entry) => entry.id !== id));
    showSuccess("Entry deleted successfully!");
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
        <h2 className="text-2xl font-semibold text-center">Your Past Entries</h2>
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

      {filteredEntries.length === 0 ? (
        <p className="text-center text-muted-foreground">
          {filterMood === "All"
            ? "No entries yet. Start by adding your first mood!"
            : `No "${filterMood}" entries found.`}
        </p>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <MoodEntryCard key={entry.id} entry={entry} onDelete={handleDeleteEntry} />
          ))}
        </div>
      )}
      <MadeWithDyad />
    </div>
  );
};

export default MoodJournal;