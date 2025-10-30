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
import { Trash2, Pencil, X, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { SpeakingQuestion, SpeakingPart, Part1_1Question, Part1_2Question, Part2Question, Part3Question } from "@/lib/types";
import { allSpeakingParts } from "@/lib/constants";
import {
  getSupabaseQuestions,
  addSupabaseQuestion,
  deleteSupabaseQuestion,
  resetSupabaseQuestionCooldowns,
  updateSupabaseQuestion,
} from "@/lib/local-db";
import { supabase } from "../integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from "@/context/AuthProvider";
import { Link } from "react-router-dom";

const SpeakingQuestionManager: React.FC = () => {
  const { session } = useAuth();
  const [currentTab, setCurrentTab] = useState<SpeakingPart>("Part 1.1");
  const [questionText, setQuestionText] = useState<string>("");
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [subQuestionsText, setSubQuestionsText] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Record<SpeakingPart, SpeakingQuestion[]>>({
    "Part 1.1": [], "Part 1.2": [], "Part 2": [], "Part 3": [],
  });

  const loadQuestions = useCallback(async () => {
    setIsLoading(true);
    const allQuestions = await getSupabaseQuestions();
    const groupedQuestions: Record<SpeakingPart, SpeakingQuestion[]> = {
      "Part 1.1": [], "Part 1.2": [], "Part 2": [], "Part 3": [],
    };
    allQuestions.forEach((q) => {
      if (q && q.type && groupedQuestions[q.type as SpeakingPart]) {
        groupedQuestions[q.type as SpeakingPart].push(q);
      }
    });
    for (const part in groupedQuestions) {
      groupedQuestions[part as SpeakingPart].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    setQuestions(groupedQuestions);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (session) {
      loadQuestions();
    }
  }, [session, loadQuestions]);

  const resetForm = () => {
    setQuestionText("");
    setImagePreviewUrls([]);
    setSubQuestionsText("");
    setEditingQuestionId(null);
  };

  const handleEditClick = (question: SpeakingQuestion) => {
    setEditingQuestionId(question.id);
    setCurrentTab(question.type);
    
    switch (question.type) {
      case "Part 1.1":
      case "Part 1.2":
        setSubQuestionsText(question.sub_questions.join('\n'));
        break;
      case "Part 2":
      case "Part 3":
        setQuestionText(question.question_text);
        break;
    }

    if ('image_urls' in question) {
      setImagePreviewUrls(question.image_urls || []);
    } else {
      setImagePreviewUrls([]);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploading(true);
      showSuccess("Rasm Supabase'ga yuklanmoqda...");

      const fileName = `${uuidv4()}-${file.name}`;
      const filePath = `public/${fileName}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from('question-images')
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from('question-images')
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

  const handleSubmitQuestion = async (part: SpeakingPart) => {
    if (isUploading) {
      showError("Rasmlar yuklanmoqda. Iltimos kuting.");
      return;
    }

    const finalImageUrls = imagePreviewUrls.filter(Boolean);
    let questionData: Omit<SpeakingQuestion, 'id' | 'date' | 'user_id'> | null = null;

    switch (part) {
      case "Part 1.1": {
        const subQ = subQuestionsText.split('\n').map(q => q.trim()).filter(Boolean);
        if (subQ.length === 0) { showError("Kamida bitta kichik savol kiriting."); return; }
        questionData = { type: part, sub_questions: subQ } as Omit<Part1_1Question, 'id' | 'date' | 'user_id'>;
        break;
      }
      case "Part 1.2": {
        const subQ = subQuestionsText.split('\n').map(q => q.trim()).filter(Boolean);
        if (finalImageUrls.length === 0 || subQ.length === 0) { showError("Rasm va kichik savollar bo'sh bo'lishi mumkin emas."); return; }
        questionData = { type: part, image_urls: finalImageUrls, sub_questions: subQ } as Omit<Part1_2Question, 'id' | 'date' | 'user_id'>;
        break;
      }
      case "Part 2": {
        if (finalImageUrls.length === 0 || !questionText.trim()) { showError("Rasm va asosiy savol bo'sh bo'lishi mumkin emas."); return; }
        questionData = { type: part, image_urls: finalImageUrls, question_text: questionText.trim() } as Omit<Part2Question, 'id' | 'date' | 'user_id'>;
        break;
      }
      case "Part 3": {
        if (finalImageUrls.length === 0 || !questionText.trim()) { showError("Rasm va asosiy savol bo'sh bo'lishi mumkin emas."); return; }
        questionData = { type: part, image_urls: finalImageUrls, question_text: questionText.trim() } as Omit<Part3Question, 'id' | 'date' | 'user_id'>;
        break;
      }
    }

    if (questionData) {
      if (editingQuestionId) {
        const existingQuestion = questions[part].find(q => q.id === editingQuestionId);
        if (existingQuestion) {
          let updatedQuestion: SpeakingQuestion;

          switch (part) {
            case "Part 1.1":
              updatedQuestion = { ...existingQuestion as Part1_1Question, ...questionData as Omit<Part1_1Question, 'id' | 'date' | 'user_id'> };
              break;
            case "Part 1.2":
              updatedQuestion = { ...existingQuestion as Part1_2Question, ...questionData as Omit<Part1_2Question, 'id' | 'date' | 'user_id'> };
              break;
            case "Part 2":
              updatedQuestion = { ...existingQuestion as Part2Question, ...questionData as Omit<Part2Question, 'id' | 'date' | 'user_id'> };
              break;
            case "Part 3":
              updatedQuestion = { ...existingQuestion as Part3Question, ...questionData as Omit<Part3Question, 'id' | 'date' | 'user_id'> };
              break;
            default:
              showError("Noma'lum savol turi.");
              return;
          }
          await updateSupabaseQuestion(updatedQuestion);
          showSuccess("Savol muvaffaqiyatli yangilandi!");
        }
      } else {
        await addSupabaseQuestion(questionData);
        showSuccess(`Savol ${part} ga qo'shildi!`);
      }
      await loadQuestions();
      resetForm();
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    const success = await deleteSupabaseQuestion(id);
    if (success) {
      showSuccess("Savol muvaffaqiyatli o'chirildi!");
      await loadQuestions();
      if (id === editingQuestionId) {
        resetForm();
      }
    }
  };

  const handleResetAllCooldowns = async () => {
    const success = await resetSupabaseQuestionCooldowns();
    if (success) {
      showSuccess("Barcha savollar cooldown'lari tiklandi!");
      await loadQuestions();
    }
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
            <Label htmlFor={`question-text-${part}`} className="text-base">Asosiy savol</Label>
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
      case "Part 1.1":
        return (
          <ul className="list-disc list-inside text-sm">
            {Array.isArray(q.sub_questions) && q.sub_questions.length > 0
              ? q.sub_questions.map((subQ, i) => <li key={i}>{subQ}</li>)
              : <li className="text-yellow-600">Kichik savollar yo'q</li>}
          </ul>
        );
      case "Part 1.2":
        return (
          <div className="flex flex-col items-start">
            {q.image_urls?.length > 0 ? (
              <div className="flex gap-2 mb-2">
                {q.image_urls.map((url, idx) => <img key={idx} src={url} alt="" className="max-h-24 object-contain rounded-md" />)}
              </div>
            ) : <p className="text-xs text-yellow-500 mb-1">(Rasm yo'q)</p>}
            <ul className="list-disc list-inside text-sm">
              {Array.isArray(q.sub_questions) && q.sub_questions.length > 0
                ? q.sub_questions.map((subQ, i) => <li key={i}>{subQ}</li>)
                : <li className="text-yellow-600">Kichik savollar yo'q</li>}
            </ul>
          </div>
        );
      case "Part 2":
        return (
          <div className="flex flex-col items-start">
            {q.image_urls?.length > 0 ? (
              <div className="flex gap-2 mb-2">
                {q.image_urls.map((url, idx) => <img key={idx} src={url} alt="" className="max-h-24 object-contain rounded-md" />)}
              </div>
            ) : <p className="text-xs text-yellow-500 mb-1">(Rasm yo'q)</p>}
            <p className="text-sm">{q.question_text ?? <span className="text-yellow-600">Savol matni yo'q</span>}</p>
          </div>
        );
      case "Part 3":
        return (
          <div className="flex flex-col items-start">
            <p className="text-sm mb-2">{q.question_text ?? <span className="text-yellow-600">Savol matni yo'q</span>}</p>
            {q.image_urls?.length > 0 ? (
              <div className="flex gap-2">
                {q.image_urls.map((url, idx) => <img key={idx} src={url} alt="" className="max-h-24 object-contain rounded-md" />)}
              </div>
            ) : <p className="text-xs text-yellow-500 mb-1">(Rasm yo'q)</p>}
          </div>
        );
      default:
        return <p className="text-sm text-red-500">Noma'lum savol turi</p>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="flex-grow container mx-auto p-4">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <div className="relative text-center">
              <Link to="/home" className="absolute left-0 top-1/2 -translate-y-1/2">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <CardTitle className="text-3xl font-bold">Savollarni Boshqarish</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={currentTab} onValueChange={(value) => { setCurrentTab(value as SpeakingPart); resetForm(); }} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                {allSpeakingParts.map(part => <TabsTrigger key={part} value={part}>{part}</TabsTrigger>)}
              </TabsList>
              {allSpeakingParts.map(part => (
                <TabsContent key={part} value={part} className="mt-4">
                  <div className="space-y-4 mb-6 p-4 border rounded-lg bg-card relative">
                    <h3 className="text-lg font-semibold">{editingQuestionId ? `Savolni Tahrirlash (ID: ...${editingQuestionId.slice(-6)})` : `Yangi ${part} Savoli Qo'shish`}</h3>
                    {renderQuestionInput(part)}
                    <div className="flex gap-2">
                      <Button onClick={() => handleSubmitQuestion(part)} className="w-full" disabled={isUploading}>
                        {editingQuestionId ? "O'zgarishlarni Saqlash" : `Savolni ${part} ga qo'shish`}
                      </Button>
                      {editingQuestionId && (
                        <Button variant="outline" onClick={resetForm} className="w-full">
                          <X className="h-4 w-4 mr-2" /> Bekor qilish
                        </Button>
                      )}
                    </div>
                  </div>
                  {isLoading ? <p className="text-center">Savollar yuklanmoqda...</p> : (
                    <div className="space-y-3">
                      {questions[part].length === 0 ? (
                        <p className="text-center text-muted-foreground">Hali savollar qo'shilmagan.</p>
                      ) : (
                        questions[part].map((q) => (
                          <div key={q.id} className="flex items-start justify-between p-3 border rounded-md bg-secondary text-secondary-foreground">
                            <div className="flex-grow mr-4">{renderQuestionCardContent(q)}</div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(q)}>
                                  <Pencil className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(q.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground text-right">
                                <span>{q.last_used ? `Oxirgi: ${format(new Date(q.last_used), "MMM dd, HH:mm")}` : "Ishlatilmagan"}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
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