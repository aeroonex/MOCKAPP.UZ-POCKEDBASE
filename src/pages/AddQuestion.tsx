"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input"; // Import Input for image URL
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showSuccess, showError } from "@/utils/toast";
import { v4 as uuidv4 } from "uuid";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import {
  SpeakingQuestion,
  SpeakingPart,
  Part1Question,
  Part1_1Question,
  Part2Question,
  Part3Question,
} from "@/lib/types"; // Import all new types
import { allSpeakingParts, getSpeakingQuestionStorageKey } from "@/lib/constants";

const SpeakingQuestionManager: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<SpeakingPart>("Part 1");
  const [questionText, setQuestionText] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>(""); // New state for image URL
  const [subQuestionsText, setSubQuestionsText] = useState<string>(""); // New state for sub-questions (Part 1.1)

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

  useEffect(() => {
    // Save questions to localStorage whenever they change
    allSpeakingParts.forEach(part => {
      const storageKey = getSpeakingQuestionStorageKey(part);
      localStorage.setItem(storageKey, JSON.stringify(questions[part]));
    });
  }, [questions]);

  const handleAddQuestion = (part: SpeakingPart) => {
    if (part === "Part 1") {
      if (!questionText.trim()) {
        showError("Savol matni bo'sh bo'lishi mumkin emas.");
        return;
      }
      const newQuestion: Part1Question = {
        id: uuidv4(),
        type: "part1",
        text: questionText.trim(),
        date: new Date().toISOString(),
      };
      setQuestions(prev => ({
        ...prev,
        [part]: [newQuestion, ...prev[part]],
      }));
      setQuestionText("");
      showSuccess(`Savol ${part} ga qo'shildi!`);
    } else if (part === "Part 1.1") {
      if (!imageUrl.trim()) {
        showError("Rasm URL manzili bo'sh bo'lishi mumkin emas.");
        return;
      }
      const subQ = subQuestionsText.split('\n').map(q => q.trim()).filter(q => q.length > 0);
      if (subQ.length === 0) {
        showError("Kamida bitta kichik savol kiritishingiz kerak.");
        return;
      }
      const newQuestion: Part1_1Question = {
        id: uuidv4(),
        type: "part1.1",
        imageUrl: imageUrl.trim(),
        subQuestions: subQ,
        date: new Date().toISOString(),
      };
      setQuestions(prev => ({
        ...prev,
        [part]: [newQuestion, ...prev[part]],
      }));
      setImageUrl("");
      setSubQuestionsText("");
      showSuccess(`Savol ${part} ga qo'shildi!`);
    } else if (part === "Part 2") {
      if (!imageUrl.trim() || !questionText.trim()) {
        showError("Rasm URL manzili va savol matni bo'sh bo'lishi mumkin emas.");
        return;
      }
      const newQuestion: Part2Question = {
        id: uuidv4(),
        type: "part2",
        imageUrl: imageUrl.trim(),
        question: questionText.trim(),
        date: new Date().toISOString(),
      };
      setQuestions(prev => ({
        ...prev,
        [part]: [newQuestion, ...prev[part]],
      }));
      setImageUrl("");
      setQuestionText("");
      showSuccess(`Savol ${part} ga qo'shildi!`);
    } else if (part === "Part 3") {
      if (!questionText.trim() || !imageUrl.trim()) {
        showError("Savol matni va rasm URL manzili bo'sh bo'lishi mumkin emas.");
        return;
      }
      const newQuestion: Part3Question = {
        id: uuidv4(),
        type: "part3",
        question: questionText.trim(),
        imageUrl: imageUrl.trim(),
        date: new Date().toISOString(),
      };
      setQuestions(prev => ({
        ...prev,
        [part]: [newQuestion, ...prev[part]],
      }));
      setQuestionText("");
      setImageUrl("");
      showSuccess(`Savol ${part} ga qo'shildi!`);
    }
  };

  const handleDeleteQuestion = (part: SpeakingPart, id: string) => {
    setQuestions(prev => ({
      ...prev,
      [part]: prev[part].filter(q => q.id !== id),
    }));
    showSuccess("Savol muvaffaqiyatli o'chirildi!");
  };

  const renderQuestionInput = (part: SpeakingPart) => {
    switch (part) {
      case "Part 1":
        return (
          <>
            <Label htmlFor={`question-text-${part}`} className="text-base">Yangi savol qo'shish</Label>
            <Textarea
              id={`question-text-${part}`}
              placeholder={`Part 1 uchun savol kiriting...`}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </>
        );
      case "Part 1.1":
        return (
          <>
            <Label htmlFor={`image-url-${part}`} className="text-base">Rasm URL manzili</Label>
            <Input
              id={`image-url-${part}`}
              placeholder="Rasm URL manzilini kiriting (masalan, https://example.com/image.jpg)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="mt-1 mb-4"
            />
            <Label htmlFor={`sub-questions-${part}`} className="text-base">Kichik savollar (har birini yangi qatordan kiriting)</Label>
            <Textarea
              id={`sub-questions-${part}`}
              placeholder="1-savol&#10;2-savol&#10;3-savol"
              value={subQuestionsText}
              onChange={(e) => setSubQuestionsText(e.target.value)}
              rows={5}
              className="mt-1"
            />
          </>
        );
      case "Part 2":
        return (
          <>
            <Label htmlFor={`image-url-${part}`} className="text-base">Rasm URL manzili</Label>
            <Input
              id={`image-url-${part}`}
              placeholder="Rasm URL manzilini kiriting (masalan, https://example.com/image.jpg)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="mt-1 mb-4"
            />
            <Label htmlFor={`question-text-${part}`} className="text-base">Asosiy savol</Label>
            <Textarea
              id={`question-text-${part}`}
              placeholder={`Part 2 uchun savol kiriting...`}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </>
        );
      case "Part 3":
        return (
          <>
            <Label htmlFor={`question-text-${part}`} className="text-base">Asosiy savol</Label>
            <Textarea
              id={`question-text-${part}`}
              placeholder={`Part 3 uchun savol kiriting...`}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              className="mt-1 mb-4"
            />
            <Label htmlFor={`image-url-${part}`} className="text-base">Rasm URL manzili</Label>
            <Input
              id={`image-url-${part}`}
              placeholder="Rasm URL manzilini kiriting (masalan, https://example.com/image.jpg)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="mt-1"
            />
          </>
        );
      default:
        return null;
    }
  };

  const renderQuestionCardContent = (q: SpeakingQuestion) => {
    switch (q.type) {
      case "part1":
        return <p className="text-sm flex-grow mr-4">{q.text}</p>;
      case "part1.1":
        return (
          <div className="flex flex-col items-start flex-grow mr-4">
            <img src={q.imageUrl} alt="Question image" className="max-h-24 object-contain mb-2 rounded-md" />
            <ul className="list-disc list-inside text-sm">
              {q.subQuestions.map((subQ, i) => (
                <li key={i}>{subQ}</li>
              ))}
            </ul>
          </div>
        );
      case "part2":
        return (
          <div className="flex flex-col items-start flex-grow mr-4">
            <img src={q.imageUrl} alt="Question image" className="max-h-24 object-contain mb-2 rounded-md" />
            <p className="text-sm">{q.question}</p>
          </div>
        );
      case "part3":
        return (
          <div className="flex flex-col items-start flex-grow mr-4">
            <p className="text-sm mb-2">{q.question}</p>
            <img src={q.imageUrl} alt="Question image" className="max-h-24 object-contain rounded-md" />
          </div>
        );
      default:
        return <p className="text-sm flex-grow mr-4">Noma'lum savol turi</p>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="flex-grow container mx-auto p-4">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Speaking savollarini boshqarish</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={currentTab} onValueChange={(value) => {
              setCurrentTab(value as SpeakingPart);
              setQuestionText(""); // Clear inputs on tab change
              setImageUrl("");
              setSubQuestionsText("");
            }} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                {allSpeakingParts.map(part => (
                  <TabsTrigger key={part} value={part}>{part}</TabsTrigger>
                ))}
              </TabsList>

              {allSpeakingParts.map(part => (
                <TabsContent key={part} value={part} className="mt-4">
                  <h3 className="text-xl font-semibold mb-4">{part} savollari</h3>
                  <div className="space-y-4 mb-6 p-4 border rounded-lg bg-card">
                    {renderQuestionInput(part)}
                    <Button onClick={() => handleAddQuestion(part)} className="w-full">
                      Savolni {part} ga qo'shish
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {questions[part].length === 0 ? (
                      <p className="text-center text-muted-foreground">Part {part} uchun hali savollar qo'shilmagan.</p>
                    ) : (
                      questions[part].map((q) => (
                        <div key={q.id} className="flex items-center justify-between p-3 border rounded-md bg-secondary text-secondary-foreground">
                          {renderQuestionCardContent(q)}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{format(new Date(q.date), "MMM dd, yyyy HH:mm")}</span>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(part, q.id)} aria-label="Savolni o'chirish">
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