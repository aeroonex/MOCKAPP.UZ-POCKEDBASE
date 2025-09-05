"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface SpeakingQuestion {
  id: string;
  text: string;
  date: string; // ISO string
}

type SpeakingPart = "Part 1" | "Part 1.1" | "Part 2" | "Part 3";

const Tests: React.FC = () => {
  const [questions, setQuestions] = useState<Record<SpeakingPart, SpeakingQuestion[]>>({
    "Part 1": [],
    "Part 1.1": [],
    "Part 2": [],
    "Part 3": [],
  });

  useEffect(() => {
    // Load questions from localStorage for each part
    const loadedQuestions: Record<SpeakingPart, SpeakingQuestion[]> = {
      "Part 1": [],
      "Part 1.1": [],
      "Part 2": [],
      "Part 3": [],
    };
    (["Part 1", "Part 1.1", "Part 2", "Part 3"] as SpeakingPart[]).forEach(part => {
      const storageKey = `speakingQuestions_${part.replace(/\s/g, '_').replace(/\./g, '')}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        loadedQuestions[part] = JSON.parse(stored);
      }
    });
    setQuestions(loadedQuestions);
  }, []);

  const allParts = ["Part 1", "Part 1.1", "Part 2", "Part 3"] as SpeakingPart[];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="flex-grow container mx-auto p-4">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">All Speaking Questions</CardTitle>
          </CardHeader>
          <CardContent>
            {allParts.map((part, index) => (
              <div key={part} className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">{part} Questions</h2>
                {questions[part].length === 0 ? (
                  <p className="text-center text-muted-foreground">No questions added for {part} yet.</p>
                ) : (
                  <div className="space-y-3">
                    {questions[part].map((q) => (
                      <div key={q.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-md bg-secondary text-secondary-foreground">
                        <p className="text-sm flex-grow mb-2 sm:mb-0 sm:mr-4">{q.text}</p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          Added: {format(new Date(q.date), "MMM dd, yyyy HH:mm")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {index < allParts.length - 1 && <Separator className="my-6" />}
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default Tests;