"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Mood {
  label: string;
  emoji: string;
}

const moods: Mood[] = [
  { label: "Happy", emoji: "😊" },
  { label: "Neutral", emoji: "😐" },
  { label: "Sad", emoji: "😔" },
  { label: "Anxious", emoji: "😟" },
  { label: "Angry", emoji: "😠" },
];

interface MoodSelectorProps {
  selectedMood: string | null;
  onSelectMood: (mood: string) => void;
}

const MoodSelector: React.FC<MoodSelectorProps> = ({
  selectedMood,
  onSelectMood,
}) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {moods.map((mood) => (
        <Button
          key={mood.label}
          variant={selectedMood === mood.label ? "default" : "outline"}
          onClick={() => onSelectMood(mood.label)}
          className={cn(
            "flex flex-col items-center justify-center p-2 h-auto w-24",
            selectedMood === mood.label && "bg-primary text-primary-foreground",
          )}
        >
          <span className="text-3xl">{mood.emoji}</span>
          <span className="text-sm mt-1">{mood.label}</span>
        </Button>
      ))}
    </div>
  );
};

export default MoodSelector;