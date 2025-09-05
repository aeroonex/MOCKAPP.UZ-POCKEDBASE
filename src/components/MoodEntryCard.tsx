"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";

interface MoodEntry {
  id: string;
  mood: string;
  text: string;
  date: string; // ISO string
}

interface MoodEntryCardProps {
  entry: MoodEntry;
  onDelete: (id: string) => void; // New prop for delete functionality
}

const moodEmojis: { [key: string]: string } = {
  Happy: "😊",
  Neutral: "😐",
  Sad: "😔",
  Anxious: "😟",
  Angry: "😠",
};

const MoodEntryCard: React.FC<MoodEntryCardProps> = ({ entry, onDelete }) => {
  const displayDate = format(new Date(entry.date), "PPP - p"); // e.g., Oct 27, 2023 - 10:30 AM

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <span className="text-3xl">{moodEmojis[entry.mood] || "❓"}</span>
          {entry.mood}
        </CardTitle>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{displayDate}</p>
          <Button variant="ghost" size="icon" onClick={() => onDelete(entry.id)} aria-label="Delete entry">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground">{entry.text}</p>
      </CardContent>
    </Card>
  );
};

export default MoodEntryCard;