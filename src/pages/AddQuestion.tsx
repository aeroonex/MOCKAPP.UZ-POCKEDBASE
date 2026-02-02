"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import AppFooter from "@/components/AppFooter"; // Yangi import
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showSuccess, showError } from "@/utils/toast";
import { Trash2, Pencil, X, ArrowLeft, RefreshCw } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTranslation } from 'react-i18next';
import { normalizeText } from "@/lib/utils"; // normalizeText funksiyasini import qilish
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile

const SpeakingQuestionManager: React.FC = () => {
  const { session, user } = useAuth();
  const isGuestMode = localStorage.getItem("isGuestMode") === "true" && !session;
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
  const { t } = useTranslation();
  const isMobile = useIsMobile(); // Use the hook

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

    // Part 1.1 savollarini o'xshashlik bo'yicha tekshirish va saralash
    if (groupedQuestions["Part 1.1"].length > 0) {
      const part1_1Questions = groupedQuestions["Part 1.1"] as Part1_1Question[];
      const similarQuestionIds = new Set<string>();

      for (let i = 0; i < part1_1Questions.length; i++) {
        for (let j = i + 1; j < part1_1Questions.length; j++) {
          const q1 = part1_1Questions[i];
          const q2 = part1_1Questions[j];

          const q1NormalizedSubQuestions = new Set(q1.sub_questions.map(normalizeText));
          const q2NormalizedSubQuestions = new Set(q2.sub_questions.map(normalizeText));

          // Agar kamida bitta umumiy normalizatsiyalangan kichik savol bo'lsa, ular o'xshash
          const intersection = new Set([...q1NormalizedSubQuestions].filter(x => q2NormalizedSubQuestions.has(x)));

          if (intersection.size > 0) {
            similarQuestionIds.add(q1.id);
            similarQuestionIds.add(q2.id);
          }
        }
      }

      const processedPart1_1Questions = part1_1Questions.map(q => ({
        ...q,
        isSimilar: similarQuestionIds.has(q.id),
      }));

      // O'xshash savollarni ro'yxatning boshiga joylashtirish
      processedPart1_1Questions.sort((a, b) => {
        if (a.isSimilar && !b.isSimilar) return -1;
        if (!a.isSimilar && b.isSimilar) return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime(); // Qolganlarini sanasi bo'yicha saralash
      });

      groupedQuestions["Part 1.1"] = processedPart1_1Questions;
    }

    for (const part in groupedQuestions) {
      if (part !== "Part 1.1") { // Part 1.1 allaqachon saralangan
        groupedQuestions[part as SpeakingPart].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
    }
    setQuestions(groupedQuestions);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

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
      if (!user) {
        showError("Faqat tizimga kirgan foydalanuvchilar rasm yuklay oladi.");
        return;
      }
      setIsUploading(true);
      showSuccess(t("add_question_page.success_video_saving"));

      const fileName = `${uuidv4()}-${file.name}`;
      const filePath = `${user.id}/${fileName}`;

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
          throw new Error(t("add_question_page.error_no_public_url"));
        }

        const newImagePreviewUrls = [...imagePreviewUrls];
        newImagePreviewUrls[index] = data.publicUrl;
        setImagePreviewUrls(newImagePreviewUrls);
        showSuccess(t("add_question_page.success_video_saved"));
      } catch (error: any) {
        showError(`${t("add_question_page.error_uploading_image")} ${error.message}`);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSubmitQuestion = async (part: SpeakingPart) => {
    if (isUploading) {
      showError(t("add_question_page.error_image_uploading_in_progress"));
      return;
    }

    const finalImageUrls = imagePreviewUrls.filter(Boolean);
    let questionData: Omit<SpeakingQuestion, 'id' | 'date' | 'user_id'> | null = null;

    switch (part) {
      case "Part 1.1": {
        const subQ = subQuestionsText.split('\n').map(q => q.trim()).filter(Boolean);
        if (subQ.length === 0) { showError(t("add_question_page.error_enter_at_least_one_sub_question")); return; }
        questionData = { type: part, sub_questions: subQ } as Omit<Part1_1Question, 'id' | 'date' | 'user_id'>;
        break;
      }
      case "Part 1.2": {
        const subQ = subQuestionsText.split('\n').map(q => q.trim()).filter(Boolean);
        if (finalImageUrls.length === 0 || subQ.length === 0) { showError(t("add_question_page.error_image_and_sub_questions_empty")); return; }
        questionData = { type: part, image_urls: finalImageUrls, sub_questions: subQ } as Omit<Part1_2Question, 'id' | 'date' | 'user_id'>;
        break;
      }
      case "Part 2": {
        if (finalImageUrls.length === 0 || !questionText.trim()) { showError(t("add_question_page.error_image_and_main_question_empty")); return; }
        questionData = { type: part, image_urls: finalImageUrls, question_text: questionText.trim() } as Omit<Part2Question, 'id' | 'date' | 'user_id'>;
        break;
      }
      case "Part 3": {
        if (finalImageUrls.length === 0 || !questionText.trim()) { showError(t("add_question_page.error_image_and_main_question_empty")); return; }
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
              showError(t("add_question_page.error_unknown_question_type"));
              return;
          }
          const result = await updateSupabaseQuestion(updatedQuestion);
          if (result) {
            showSuccess(t("add_question_page.success_question_updated"));
            await loadQuestions();
            resetForm();
          }
        }
      } else {
        const result = await addSupabaseQuestion(questionData);
        if (result) {
          showSuccess(t("add_question_page.success_question_added_to_part", { part }));
          await loadQuestions();
          resetForm();
        }
      }
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    const success = await deleteSupabaseQuestion(id);
    if (success) {
      showSuccess(t("add_question_page.success_question_deleted"));
      await loadQuestions();
      if (id === editingQuestionId) {
        resetForm();
      }
    }
  };

  const handleResetAllCooldowns = async () => {
    const success = await resetSupabaseQuestionCooldowns();
    if (success) {
      showSuccess(t("add_question_page.success_cooldowns_reset"));
      await loadQuestions();
    }
  };

  const renderQuestionInput = (part: SpeakingPart) => {
    const isImageRequiredPart = ["Part 1.2", "Part 2", "Part 3"].includes(part);
    return (
      <>
        {isImageRequiredPart && (
          <div className="space-y-4 mb-4">
            <Label className="text-base">{t("add_question_page.upload_images")}</Label>
            {[0, 1].map((idx) => (
              <div key={idx} className="space-y-2 border p-2 rounded-md">
                <Label htmlFor={`image-upload-${part}-${idx}`} className="text-sm">{t("add_question_page.upload_image", { index: idx + 1 })}</Label>
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
                    <p className="text-sm text-muted-foreground mb-1">{t("add_question_page.image_preview")}</p>
                    <img src={imagePreviewUrls[idx]} alt={`Image Preview ${idx + 1}`} className="max-h-32 object-contain rounded-md border p-1" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {["Part 1.1", "Part 1.2"].includes(part) && (
          <>
            <Label htmlFor={`sub-questions-${part}`} className="text-base">{t("add_question_page.sub_questions")}</Label>
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
            <Label htmlFor={`question-text-${part}`} className="text-base">{t("add_question_page.main_question")}</Label>
            <Textarea
              id={`question-text-${part}`}
              placeholder={t("add_question_page.enter_question_for_part", { part })}
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
              : <li className="text-yellow-600">{t("add_question_page.no_sub_questions")}</li>}
          </ul>
        );
      case "Part 1.2":
        return (
          <div className="flex flex-col items-start">
            {q.image_urls?.length > 0 ? (
              <div className="flex gap-2 mb-2">
                {q.image_urls.map((url, idx) => <img key={idx} src={url} alt="" className="max-h-24 object-contain rounded-md" />)}
              </div>
            ) : <p className="text-xs text-yellow-500 mb-1">{t("add_question_page.no_image")}</p>}
            <ul className="list-disc list-inside text-sm">
              {Array.isArray(q.sub_questions) && q.sub_questions.length > 0
                ? q.sub_questions.map((subQ, i) => <li key={i}>{subQ}</li>)
                : <li className="text-yellow-600">{t("add_question_page.no_sub_questions")}</li>}
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
            ) : <p className="text-xs text-yellow-500 mb-1">{t("add_question_page.no_image")}</p>}
            <p className="text-sm">{q.question_text ?? <span className="text-yellow-600">{t("add_question_page.no_question_text")}</span>}</p>
          </div>
        );
      case "Part 3":
        return (
          <div className="flex flex-col items-start">
            <p className="text-sm mb-2">{q.question_text ?? <span className="text-yellow-600">{t("add_question_page.no_question_text")}</span>}</p>
            {q.image_urls?.length > 0 ? (
              <div className="flex gap-2">
                {q.image_urls.map((url, idx) => <img key={idx} src={url} alt="" className="max-h-24 object-contain rounded-md" />)}
              </div>
            ) : <p className="text-xs text-yellow-500 mb-1">{t("add_question_page.no_image")}</p>}
          </div>
        );
      default:
        return <p className="text-sm text-red-500">{t("add_question_page.error_unknown_question_type")}</p>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto p-4">
        <Card className="max-w-3xl mx-auto">
          <CardHeader className="pt-8">
            <div className="flex justify-between items-center">
              <Link to="/home">
                <Button variant="default" className="bg-primary hover:bg-primary/90">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t("common.back")}
                </Button>
              </Link>
              <CardTitle className="text-xl sm:text-3xl font-bold text-center flex-grow">
                {t("add_question_page.question_management")}
              </CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={handleResetAllCooldowns} 
                    variant="default"
                    size="icon"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("add_question_page.reset_all_cooldowns")}</p>
                </TooltipContent>
              </Tooltip>
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
                    <h3 className="text-lg font-semibold">
                      {editingQuestionId ? t("add_question_page.edit_question_title", { id_suffix: editingQuestionId.slice(-6) }) : t("add_question_page.add_new_question_title", { part })}
                    </h3>
                    {isGuestMode && (
                      <div className="p-3 text-center bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-700 rounded-md text-yellow-800 dark:text-yellow-300">
                        <p>{t("add_question_page.guest_mode_add_question_warning")}</p>
                      </div>
                    )}
                    <fieldset disabled={isGuestMode}>
                      {renderQuestionInput(part)}
                      <div className="flex gap-2 mt-4">
                        <Button onClick={() => handleSubmitQuestion(part)} className="w-full" disabled={isUploading}>
                          {editingQuestionId ? t("add_question_page.save_changes") : t("add_question_page.add_question_to_part", { part })}
                        </Button>
                        {editingQuestionId && (
                          <Button variant="outline" onClick={resetForm} className="w-full">
                            <X className="h-4 w-4 mr-2" /> {t("add_question_page.cancel")}
                          </Button>
                        )}
                      </div>
                    </fieldset>
                  </div>
                  {isLoading ? <p className="text-center">{t("add_question_page.questions_loading")}</p> : (
                    <div className="space-y-3">
                      {questions[part].length === 0 ? (
                        <p className="text-center text-muted-foreground">{t("add_question_page.no_questions_added")}</p>
                      ) : (
                        questions[part].map((q) => (
                          <div 
                            key={q.id} 
                            className={`flex items-start justify-between p-3 border rounded-md bg-secondary text-secondary-foreground ${q.isSimilar ? 'border-red-400 bg-red-50/50 dark:bg-red-900/20' : ''}`}
                          >
                            <div className="flex-grow mr-4">{renderQuestionCardContent(q)}</div>
                            <div className="flex flex-col items-end gap-2">
                              {!isGuestMode && (
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(q)}>
                                    <Pencil className="h-4 w-4 text-blue-500" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>{t("add_question_page.delete_question_confirm_title")}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          {t("add_question_page.delete_question_confirm_description")}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>{t("add_question_page.cancel")}</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteQuestion(q.id)}>{t("add_question_page.delete")}</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground text-right">
                                <span>{q.last_used ? t("add_question_page.last_used", { date: format(new Date(q.last_used), "MMM dd, HH:mm") }) : t("add_question_page.not_used")}</span>
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
          </CardContent>
        </Card>
      </main>
      {!isMobile && <AppFooter />} {/* Conditionally render AppFooter */}
    </div>
  );
};

export default SpeakingQuestionManager;