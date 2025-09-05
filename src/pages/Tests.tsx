"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { SpeakingQuestion, SpeakingPart, Part1Question, Part1_1Question, Part2Question, Part3Question } from "@/lib/types"; // Import all new types
import { allSpeakingParts, getSpeakingQuestionStorageKey } from "@/lib/constants";

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
    allSpeakingParts.forEach(part => {
      const storageKey = getSpeakingQuestionStorageKey(part);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        loadedQuestions[part] = JSON.parse(stored);
      }
    });
    setQuestions(loadedQuestions);
  }, []);

  const renderQuestionContent = (q: SpeakingQuestion) => {
    switch (q.type) {
      case "part1":
        const part1Q = q as Part1Question;
        return <p className="text-sm flex-grow mb-2 sm:mb-0 sm:mr-4">{part1Q.text}</p>;
      case "part1.1":
        const part1_1Q = q as Part1_1Question;
        return (
          <div className="flex flex-col sm:flex-row sm:items-center flex-grow mb-2 sm:mb-0 sm:mr-4">
            <img src={part1_1Q.imageUrl} alt="Question image" className="max-h-16 object-contain mr-4 mb-2 sm:mb-0 rounded-md" />
            <div className="flex flex-col">
              <p className="text-sm font-semibold">Savollar:</p>
              <ul className="list-disc list-inside text-xs">
                {part1_1Q.subQuestions.map((subQ, i) => (
                  <li key={i}>{subQ}</li>
                ))}
              </ul>
            </div>
          </div>
        );
      case "part2":
        const part2Q = q as Part2Question;
        return (
          <div className="flex flex-col sm:flex-row sm:items-center flex-grow mb-2 sm:mb-0 sm:mr-4">
            <img src={part2Q.imageUrl} alt="Question image" className="max-h-16 object-contain mr-4 mb-2 sm:mb-0 rounded-md" />
            <p className="text-sm">{part2Q.question}</p>
          </div>
        );
      case "part3":
        const part3Q = q as Part3Question;
        return (
          <div className="flex flex-col sm:flex-row sm:items-center flex-grow mb-2 sm:mb-0 sm:mr-4">
            <p className="text-sm mr-4">{part3Q.question}</p>
            <img src={part3Q.imageUrl} alt="Question image" className="max-h-16 object-contain rounded-md" />
          </div>
        );
      default:
        return <p className="text-sm flex-grow mb-2 sm:mb-0 sm:mr-4">Noma'lum savol turi</p>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="flex-grow container mx-auto p-4">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Barcha Speaking savollari</CardTitle>
          </CardHeader>
          <CardContent>
            {allSpeakingParts.map((part, index) => (
              <div key={part} className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">{part} savollari</h2>
                {questions[part].length === 0 ? (
                  <p className="text-center text-muted-foreground">Part {part} uchun hali savollar qo'shilmagan.</p>
                ) : (
                  <div className="space-y-3">
                    {questions[part].map((q) => (
                      <div key={q.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-md bg-secondary text-secondary-foreground">
                        {renderQuestionContent(q)}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          Qo'shilgan: {format(new Date(q.date), "MMM dd, yyyy HH:mm")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {index < allSpeakingParts.length - 1 && <Separator className="my-6" />}
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