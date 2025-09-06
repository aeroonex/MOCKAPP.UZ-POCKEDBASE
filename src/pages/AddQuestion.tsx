"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { CefrCentreFooter } from "@/components/CefrCentreFooter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showSuccess, showError } from "@/utils/toast";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import {
  SpeakingQuestion,
  SpeakingPart,
  Part1_1Question,
  Part1_2Question,
  Part2Question,
  Part3Question,
} from "@/lib/types";
import { allSpeakingParts } from "@/lib/constants";
import {
  getLocalQuestions,
  addLocalQuestion,
  deleteLocalQuestion,
  resetLocalQuestionCooldowns,
} from "@/lib/local-db";
import { supabase } from "../integrations/supabase/client"; // Supabase klientini import qilish
import { v4 as uuidv4 } from 'uuid'; // Noyob fayl nomlari uchun

const SpeakingQuestionManager: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<SpeakingPart>("Part 1.1");
  const [questionText, setQuestionText] = useState<string>("");
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [subQuestionsText, setSubQuestionsText] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [questions, setQuestions] = useState<Record<SpeakingPart, SpeakingQuestion[]>>({
    "Part 1.1": [],
    "Part 1.2": [],
    "Part 2": [],
    "Part 3": [],
  });

  const fetchQuestions = useCallback(() => {
    setIsLoading(true);
    const allLocalQuestions = getLocalQuestions();
    const groupedQuestions: Record<SpeakingPart, SpeakingQuestion[]> = {
      "Part 1.1": [], "Part 1.2": [], "Part 2": [], "Part 3": [],
    };
    allLocalQuestions.forEach((q: SpeakingQuestion) => {
      if (groupedQuestions[q.type as SpeakingPart]) {
        groupedQuestions[q.type as SpeakingPart].push(q);
      }
    });
    setQuestions(groupedQuestions);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploading(true);
      showSuccess("Rasm Supabase'ga yuklanmoqda...");

      const fileName = `${uuidv4()}-${file.name}`;
      const filePath = `public/${fileName}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from('question_images')
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from('question_images')
          .getPublicUrl(filePath);

        if (!data.publicUrl) {
          throw new Error("Public URL olinmadi.");
        }

        const newImagePreviewUrls = [...imagePreviewUrls];
        newImagePreviewUrls[index] = data.publicUrl;
        setImagePreviewUrls(newImagePreviewUrls);
        showSuccess("Rasm muvaffaqiyatli yuklandi!");
      } catch (error: any) {
        showError(`Rasmni yuklashda xatolik: ${error.message}`);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleAddQuestion = (part: SpeakingPart) => {
    if (isUploading) {
      showError("Rasmlar yuklanmoqda. Iltimos kuting.");
      return;
    }

    let newQuestionData: Omit<SpeakingQuestion, 'id' | 'date' | 'user_id'> | null = null;
    const finalImageUrls = imagePreviewUrls.filter(Boolean);

    if (part === "Part 1.1") {
      const subQ = subQuestionsText.split('\n').map(q => q.trim()).filter(Boolean);
      if (subQ.length === 0) return showError("Kamida bitta kichik savol kiriting.");
      newQuestionData = { type: "part1.1", sub_questions: subQ } as Omit<Part1_1Question, 'id' | 'date' | 'user_id'>;
    } else if (part === "Part 1.2") {
      const subQ = subQuestionsText.split('\n').map(q => q.trim()).filter(Boolean);
      if (finalImageUrls.length === 0 || subQ.length === 0) return showError("Rasm va kichik savollar bo'sh bo'lishi mumkin emas.");
      newQuestionData = { type: "part1.2", image_urls: finalImageUrls, sub_questions: subQ } as Omit<Part1_2Question, 'id' | 'date' | 'user_id'>;
    } else if (part === "Part 2") {
      if (finalImageUrls.length === 0 || !questionText.trim()) return showError("Rasm va asosiy savol bo'sh bo'lishi mumkin emas.");
      newQuestionData = { type: "part2", image_urls: finalImageUrls, question_text: questionText.trim() } as Omit<Part2Question, 'id' | 'date' | 'user_id'>;
    } else if (part === "Part 3") {
      if (finalImageUrls.length === 0 || !questionText.trim()) return showError("Rasm va asosiy savol bo'sh bo'lishi mumkin emas.");
      newQuestionData = { type: "part3", image_urls: finalImageUrls, question_text: questionText.trim() } as Omit<Part3Question, 'id' | 'date' | 'user_id'>;
    }

    if (newQuestionData) {
      const newQuestion = addLocalQuestion(newQuestionData);
      showSuccess(`Savol ${part} ga qo'shildi!`);
      
      setQuestions(prevQuestions => ({
        ...prevQuestions,
        [part]: [...prevQuestions[part], newQuestion].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      }));

      setQuestionText("");
      setImagePreviewUrls([]);
      setSubQuestionsText("");
    }
  };

  const handleDeleteQuestion = (part: SpeakingPart, id: string) => {
    deleteLocalQuestion(id);
    showSuccess("Savol muvaffaqiyatli o'chirildi!");
    
    setQuestions(prevQuestions => ({
      ...prevQuestions,
      [part]: prevQuestions[part].filter(q => q.id !== id),
    }));
  };

  const handleResetAllCooldowns = () => {
    resetLocalQuestionCooldowns();
    showSuccess("Barcha savollar cooldown'lari tiklandi!");
    fetchQuestions();
  };

  const renderQuestionInput = (part: SpeakingPart) => {
    const isImageRequiredPart = ["Part 1.2", "Part 2", "Part 3"].includes(part);
    return (
      <>
        {isImageRequiredPart && (
          <div className="space-y-4 mb-4">
            <Label className="text-base">Rasmlar yuklash (1 yoki 2 ta rasm)</Label>
            {[0, 1].map((idx) => (
              <div key={idx} className="space-y-2 border p-2 rounded-md">
                <Label htmlFor={`image-upload-${part}-${idx}`} className="text-sm">Rasm {idx + 1} yuklash</Label>
                <Input
                  id={`image-upload-${part}-${idx}`}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, idx)}
                  className="mt-1"
                  disabled={isUploading}
                />
                {imagePreviewUrls[idx] && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-1">Oldindan ko'rish:</p>
                    <img src={imagePreviewUrls[idx]} alt={`Image Preview ${idx + 1}`} className="max-h-32 object-contain rounded-md border p-1" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {["Part 1.1", "Part 1.2"].includes(part) && (
          <>
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
        )}

        {["Part 2", "Part 3"].includes(part) && (
          <>
            <Label htmlFor={`question-text-${part}`} className="text-base">Asiy savol</Label>
            <Textarea
              id={`question-text-${part}`}
              placeholder={`${part} uchun savol kiriting...`}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </>
        )}
      </>
    );
  };

  const renderQuestionCardContent = (q: SpeakingQuestion) => {
    switch (q.type) {
      case "part1.1":
        return (
          <ul className="list-disc list-inside text-sm">
            {q.sub_questions.map((subQ, i) => <li key={i}>{subQ}</li>)}
          </ul>
        );
      case "part1.2":
        return (
          <div className="flex flex-col items-start">
            <div className="flex gap-2 mb-2">
              {q.image_urls.map((url, idx) => <img key={idx} src={url} alt="" className="max-h-24 object-contain rounded-md" />)}
            </div>
            <ul className="list-disc list-inside text-sm">
              {q.sub_questions.map((subQ, i) => <li key={i}>{subQ}</li>)}
            </ul>
          </div>
        );
      case "part2":
        return (
          <div className="flex flex-col items-start">
            <div className="flex gap-2 mb-2">
              {q.image_urls.map((url, idx) => <img key={idx} src={url} alt="" className="max-h-24 object-contain rounded-md" />)}
            </div>
            <p className="text-sm">{q.question_text}</p>
          </div>
        );
      case "part3":
        return (
          <div className="flex flex-col items-start">
            <p className="text-sm mb-2">{q.question_text}</p>
            <div className="flex gap-2">
              {q.image_urls.map((url, idx) => <img key={idx} src={url} alt="" className="max-h-24 object-contain rounded-md" />)}
            </div>
          </div>
        );
      default:
        return <p className="text-sm">Noma'lum savol turi</p>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="flex-grow container mx-auto p-4">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Savollarni Boshqarish</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as SpeakingPart)} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                {allSpeakingParts.map(part => <TabsTrigger key={part} value={part}>{part}</TabsTrigger>)}
              </TabsList>
              {allSpeakingParts.map(part => (
                <TabsContent key={part} value={part} className="mt-4">
                  <div className="space-y-4 mb-6 p-4 border rounded-lg bg-card">
                    {renderQuestionInput(part)}
                    <Button onClick={() => handleAddQuestion(part)} className="w-full" disabled={isUploading}>
                      Savolni {part} ga qo'shish
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {isLoading ? <p>Yuklanmoqda...</p> : questions[part].length === 0 ? (
                      <p className="text-center text-muted-foreground">Hali savollar qo'shilmagan.</p>
                    ) : (
                      questions[part].map((q) => (
                        <div key={q.id} className="flex items-center justify-between p-3 border rounded-md bg-secondary text-secondary-foreground">
                          <div className="flex-grow mr-4">{renderQuestionCardContent(q)}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{q.last_used ? `Oxirgi: ${format(new Date(q.last_used), "MMM dd, HH:mm")}` : "Ishlatilmagan"}</span>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(part, q.id)}>
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
            <div className="mt-6 text-center">
              <Button onClick={handleResetAllCooldowns} variant="outline" className="w-full">
                Barcha savollar cooldown'ini tiklash
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <CefrCentreFooter />
    </div>
  );
};

export default SpeakingQuestionManager;