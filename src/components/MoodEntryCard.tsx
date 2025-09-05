"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface MoodEntry {
  id: string;
  mood: string;
  text: string;
  date: string; // ISO string
}

interface MoodEntryCardProps {
  entry: MoodEntry;
}

const moodEmojis: { [key: string]: string } = {
  Happy: "😊",
  Neutral: "😐",
  Sad: "😔",
  Anxious: "😟",
  Angry: "😠",
};

const MoodEntryCard: React.FC<MoodEntryCardProps> = ({ entry }) => {
  const displayDate = format(new Date(entry.date), "PPP - p"); // e.g., Oct 27, 2023 - 10:30 AM

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <span className="text-3xl">{moodEmojis[entry.mood] || "❓"}</span>
          {entry.mood}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{displayDate}</p>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground">{entry.text}</p>
      </CardContent>
    </Card>
  );
};

export default MoodEntryCard;