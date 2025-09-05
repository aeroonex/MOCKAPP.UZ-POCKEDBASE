"use client";

import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import JournalEntryForm from "@/components/JournalEntryForm";
import MoodEntryCard from "@/components/MoodEntryCard";
import { MadeWithDyad } from "@/components/made-with-dyad";

interface MoodEntry {
  id: string;
  mood: string;
  text: string;
  date: string; // ISO string
}

const MoodJournal: React.FC = () => {
  const [entries, setEntries] = useState<MoodEntry[]>([]);

  useEffect(() => {
    // Load entries from local storage on component mount
    const storedEntries = localStorage.getItem("moodJournalEntries");
    if (storedEntries) {
      setEntries(JSON.parse(storedEntries));
    }
  }, []);

  useEffect(() => {
    // Save entries to local storage whenever they change
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

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-4xl font-bold text-center mb-8">Mood Journal & Tracker</h1>

      <div className="mb-8">
        <JournalEntryForm onAddEntry={handleAddEntry} />
      </div>

      <h2 className="text-2xl font-semibold mb-4 text-center">Your Past Entries</h2>
      {entries.length === 0 ? (
        <p className="text-center text-muted-foreground">No entries yet. Start by adding your first mood!</p>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <MoodEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
      <MadeWithDyad />
    </div>
  );
};

export default MoodJournal;