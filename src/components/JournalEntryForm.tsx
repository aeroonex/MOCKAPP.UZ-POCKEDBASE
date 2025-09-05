"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import MoodSelector from "./MoodSelector";
import { showSuccess, showError } from "@/utils/toast";

interface JournalEntryFormProps {
  onAddEntry: (mood: string, text: string) => void;
}

const JournalEntryForm: React.FC<JournalEntryFormProps> = ({ onAddEntry }) => {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [journalText, setJournalText] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMood) {
      showError("Please select a mood.");
      return;
    }
    if (!journalText.trim()) {
      showError("Journal entry cannot be empty.");
      return;
    }
    onAddEntry(selectedMood, journalText.trim());
    setSelectedMood(null);
    setJournalText("");
    showSuccess("Mood entry added!");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg shadow-sm bg-card">
      <div>
        <h3 className="text-lg font-semibold mb-2">How are you feeling today?</h3>
        <MoodSelector
          selectedMood={selectedMood}
          onSelectMood={setSelectedMood}
        />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Journal Entry</h3>
        <Textarea
          placeholder="Write about your day..."
          value={journalText}
          onChange={(e) => setJournalText(e.target.value)}
          rows={5}
          className="w-full"
        />
      </div>
      <Button type="submit" className="w-full">
        Add Entry
      </Button>
    </form>
  );
};

export default JournalEntryForm;