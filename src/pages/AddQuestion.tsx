"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showSuccess, showError } from "@/utils/toast";
import { v4 as uuidv4 } from "uuid";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";

interface SpeakingQuestion {
  id: string;
  text: string;
  date: string; // ISO string
}

type SpeakingPart = "Part 1" | "Part 1.1" | "Part 2" | "Part 3";

const SpeakingQuestionManager: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<SpeakingPart>("Part 1");
  const [questionText, setQuestionText] = useState<string>("");
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

  useEffect(() => {
    // Save questions to localStorage whenever they change
    (["Part 1", "Part 1.1", "Part 2", "Part 3"] as SpeakingPart[]).forEach(part => {
      const storageKey = `speakingQuestions_${part.replace(/\s/g, '_').replace(/\./g, '')}`;
      localStorage.setItem(storageKey, JSON.stringify(questions[part]));
    });
  }, [questions]);

  const handleAddQuestion = (part: SpeakingPart) => {
    if (!questionText.trim()) {
      showError("Question text cannot be empty.");
      return;
    }

    const newQuestion: SpeakingQuestion = {
      id: uuidv4(),
      text: questionText.trim(),
      date: new Date().toISOString(),
    };

    setQuestions(prev => ({
      ...prev,
      [part]: [newQuestion, ...prev[part]],
    }));
    setQuestionText("");
    showSuccess(`Question added to ${part}!`);
  };

  const handleDeleteQuestion = (part: SpeakingPart, id: string) => {
    setQuestions(prev => ({
      ...prev,
      [part]: prev[part].filter(q => q.id !== id),
    }));
    showSuccess("Question deleted successfully!");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="flex-grow container mx-auto p-4">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Manage Speaking Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as SpeakingPart)} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="Part 1">Part 1</TabsTrigger>
                <TabsTrigger value="Part 1.1">Part 1.1</TabsTrigger>
                <TabsTrigger value="Part 2">Part 2</TabsTrigger>
                <TabsTrigger value="Part 3">Part 3</TabsTrigger>
              </TabsList>

              {(["Part 1", "Part 1.1", "Part 2", "Part 3"] as SpeakingPart[]).map(part => (
                <TabsContent key={part} value={part} className="mt-4">
                  <h3 className="text-xl font-semibold mb-4">{part} Questions</h3>
                  <div className="space-y-4 mb-6 p-4 border rounded-lg bg-card">
                    <Label htmlFor={`question-text-${part}`} className="text-base">Add New Question</Label>
                    <Textarea
                      id={`question-text-${part}`}
                      placeholder={`Enter a question for ${part}...`}
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      rows={3}
                      className="mt-1"
                    />
                    <Button onClick={() => handleAddQuestion(part)} className="w-full">
                      Add Question to {part}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {questions[part].length === 0 ? (
                      <p className="text-center text-muted-foreground">No questions added for {part} yet.</p>
                    ) : (
                      questions[part].map((q) => (
                        <div key={q.id} className="flex items-center justify-between p-3 border rounded-md bg-secondary text-secondary-foreground">
                          <p className="text-sm flex-grow mr-4">{q.text}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{format(new Date(q.date), "MMM dd, yyyy HH:mm")}</span>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(part, q.id)} aria-label="Delete question">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default SpeakingQuestionManager;