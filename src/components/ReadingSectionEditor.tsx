"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { v4 as uuidv4 } from 'uuid';
import { Trash2, PlusCircle, BookText, Pencil, XCircle } from "lucide-react";
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
import { CEFRQuestion, CEFRQuestionOption } from "@/lib/types"; // Yangi interfeyslarni import qilish

interface ReadingQuestion extends CEFRQuestion {
  options: CEFRQuestionOption[];
}

interface ReadingSectionEditorProps {
  sectionId: string | undefined;
}

const ReadingSectionEditor: React.FC<ReadingSectionEditorProps> = ({ sectionId }) => {
  const { t } = useTranslation();

  const [questions, setQuestions] = useState<ReadingQuestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingQuestion, setEditingQuestion] = useState<ReadingQuestion | null>(null);

  // Form states
  const [readingPassage, setReadingPassage] = useState<string>("");
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [questionText, setQuestionText] = useState<string>(""); // For the actual question about the passage
  const [options, setOptions] = useState<{ id?: string; text: string; isCorrect: boolean }[]>([
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    if (!sectionId) {
      setQuestions([]);
      setIsLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('cefr_questions') // Yangi jadval nomi
      .select(`
        id,
        question_text,
        image_urls,
        question_type,
        correct_answer,
        cefr_options (id, option_text, is_correct)
      `)
      .eq('section_id', sectionId)
      .order('created_at', { ascending: true });

    if (error) {
      showError(`${t("question_management_page.error_loading_questions")} ${error.message}`);
      setQuestions([]);
    } else {
      setQuestions(data.map(q => ({
        ...q,
        options: q.cefr_options || []
      })) as ReadingQuestion[]);
    }
    setIsLoading(false);
  }, [sectionId, t]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const resetForm = () => {
    setReadingPassage("");
    setImagePreviewUrls([]);
    setQuestionText("");
    setOptions([
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ]);
    setEditingQuestion(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    setIsUploadingImage(true);
    showSuccess(t("add_question_page.success_video_saving"));

    const userResponse = await supabase.auth.getUser();
    const userId = userResponse.data.user?.id;

    if (!userId) {
      showError(t("add_question_page.error_login_to_upload"));
      setIsUploadingImage(false);
      return;
    }

    const fileName = `${uuidv4()}-${file.name}`;
    const filePath = `${userId}/cefr-reading-images/${fileName}`; // Yangi bucket nomi

    try {
      const { error: uploadError } = await supabase.storage
        .from('cefr-reading-images') // Yangi bucket nomi
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('cefr-reading-images') // Yangi bucket nomi
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
      setIsUploadingImage(false);
    }
  };

  const handleOptionChange = (index: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    const newOptions = [...options];
    if (field === 'isCorrect') {
      newOptions.forEach((opt, i) => (opt.isCorrect = i === index ? (value as boolean) : false));
    } else {
      newOptions[index][field] = value as string;
    }
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions(prev => [...prev, { text: "", isCorrect: false }]);
  };

  const removeOption = (index: number) => {
    setOptions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveQuestion = async () => {
    if (!sectionId) {
      showError(t("question_management_page.error_section_id_missing"));
      return;
    }
    if (!readingPassage.trim() || !questionText.trim() || options.length < 2 || options.every(opt => !opt.text.trim()) || options.every(opt => !opt.isCorrect)) {
      showError(t("add_question_page.error_fill_all_fields"));
      return;
    }

    setIsLoading(true);
    try {
      if (editingQuestion) {
        // Update existing question
        const { error: qError } = await supabase
          .from('cefr_questions') // Yangi jadval nomi
          .update({
            question_text: readingPassage.trim(), // Main text is stored here
            image_urls: imagePreviewUrls,
            correct_answer: questionText.trim(), // Actual question about the passage
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingQuestion.id);
        if (qError) throw qError;

        // Update options
        await Promise.all(options.map(async (opt, index) => {
          if (opt.id) { // Existing option
            await supabase
              .from('cefr_options') // Yangi jadval nomi
              .update({ option_text: opt.text.trim(), is_correct: opt.isCorrect, updated_at: new Date().toISOString() })
              .eq('id', opt.id);
          } else { // New option
            await supabase
              .from('cefr_options') // Yangi jadval nomi
              .insert({ question_id: editingQuestion.id, option_text: opt.text.trim(), is_correct: opt.isCorrect });
          }
        }));
        const existingOptionIds = new Set(options.filter(o => o.id).map(o => o.id));
        const optionsToDelete = editingQuestion.options.filter(o => !existingOptionIds.has(o.id));
        if (optionsToDelete.length > 0) {
          await supabase.from('cefr_options').delete().in('id', optionsToDelete.map(o => o.id)); // Yangi jadval nomi
        }

        showSuccess(t("question_management_page.question_updated_successfully"));
      } else {
        // Create new question
        const { data: newQuestion, error: qError } = await supabase
          .from('cefr_questions') // Yangi jadval nomi
          .insert({
            section_id: sectionId,
            question_text: readingPassage.trim(), // Main text is stored here
            image_urls: imagePreviewUrls,
            correct_answer: questionText.trim(), // Actual question about the passage
            question_type: 'multiple_choice',
          })
          .select()
          .single();
        if (qError) throw qError;

        await supabase
          .from('cefr_options') // Yangi jadval nomi
          .insert(options.map(opt => ({
            question_id: newQuestion.id,
            option_text: opt.text.trim(),
            is_correct: opt.isCorrect,
          })));

        showSuccess(t("question_management_page.question_added_successfully"));
      }
      resetForm();
      fetchQuestions();
    } catch (error: any) {
      showError(`${t("common.error_saving_entry")} ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditQuestionClick = (question: ReadingQuestion) => {
    setEditingQuestion(question);
    setReadingPassage(question.question_text || "");
    setImagePreviewUrls(question.image_urls || []);
    setQuestionText(question.correct_answer || ""); // The actual question about the passage
    setOptions(question.options.map(opt => ({ id: opt.id, text: opt.option_text, isCorrect: opt.is_correct })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteQuestion = async (questionId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('cefr_questions') // Yangi jadval nomi
        .delete()
        .eq('id', questionId);
      if (error) throw error;
      showSuccess(t("question_management_page.question_deleted_successfully"));
      fetchQuestions();
      if (editingQuestion?.id === questionId) {
        resetForm();
      }
    } catch (error: any) {
      showError(`${t("common.error_deleting_entry")} ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookText className="h-6 w-6" /> {t("question_management_page.reading_section")}
        </CardTitle>
        <CardDescription>{t("question_management_page.reading_section_description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <fieldset disabled={isLoading}>
          <div className="space-y-2">
            <Label htmlFor="reading-passage">{t("question_management_page.reading_passage")}</Label>
            <Textarea
              id="reading-passage"
              placeholder={t("question_management_page.enter_reading_passage")}
              value={readingPassage}
              onChange={(e) => setReadingPassage(e.target.value)}
              rows={8}
            />
          </div>

          <div className="space-y-4 mb-4">
            <Label className="text-base">{t("add_question_page.upload_images")}</Label>
            {[0, 1].map((idx) => (
              <div key={idx} className="space-y-2 border p-2 rounded-md">
                <Label htmlFor={`image-upload-${idx}`} className="text-sm">{t("add_question_page.upload_image", { index: idx + 1 })}</Label>
                <Input
                  id={`image-upload-${idx}`}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, idx)}
                  className="mt-1"
                  disabled={isUploadingImage}
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

          <div className="space-y-2">
            <Label htmlFor="question-text">{t("question_management_page.question_about_passage")}</Label>
            <Input
              id="question-text"
              placeholder={t("question_management_page.enter_question_about_passage")}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("question_management_page.options")}</Label>
            {options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox
                  id={`option-correct-${index}`}
                  checked={option.isCorrect}
                  onCheckedChange={(checked: boolean) => handleOptionChange(index, 'isCorrect', checked)}
                />
                <Label htmlFor={`option-correct-${index}`}>{t("question_management_page.correct")}</Label>
                <Input
                  type="text"
                  placeholder={`${t("question_management_page.option")} ${index + 1}`}
                  value={option.text}
                  onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                  className="flex-grow"
                />
                {options.length > 2 && (
                  <Button variant="ghost" size="icon" onClick={() => removeOption(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" onClick={addOption} className="w-full">
              <PlusCircle className="h-4 w-4 mr-2" /> {t("question_management_page.add_option")}
            </Button>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleSaveQuestion} className="w-full" disabled={isLoading || isUploadingImage}>
              {isLoading ? t("common.saving") : (editingQuestion ? t("common.save_changes") : t("question_management_page.add_question"))}
            </Button>
            {editingQuestion && (
              <Button variant="outline" onClick={resetForm} disabled={isLoading}>
                <XCircle className="h-4 w-4 mr-2" /> {t("add_question_page.cancel")}
              </Button>
            )}
          </div>
        </fieldset>

        <h3 className="text-xl font-semibold mt-8">{t("question_management_page.existing_questions")}</h3>
        {isLoading ? (
          <p className="text-center">{t("common.loading")}</p>
        ) : questions.length === 0 ? (
          <p className="text-muted-foreground text-center">{t("question_management_page.no_questions_added")}</p>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => (
              <Card key={q.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-grow">
                    <p className="font-semibold mb-2">{t("question_management_page.passage")}:</p>
                    <p className="text-sm text-muted-foreground mb-2">{q.question_text}</p>
                    {q.image_urls && q.image_urls.length > 0 && (
                      <div className="flex gap-2 mb-2">
                        {q.image_urls.map((url, idx) => <img key={idx} src={url} alt="" className="max-h-24 object-contain rounded-md" />)}
                      </div>
                    )}
                    <p className="font-semibold mt-2">{t("question_management_page.question")}: {q.correct_answer}</p>
                    <ul className="list-disc list-inside text-sm mt-2">
                      {q.options.map(opt => (
                        <li key={opt.id} className={opt.is_correct ? "text-green-600 font-medium" : "text-muted-foreground"}>
                          {opt.option_text} {opt.is_correct && `(${t("question_management_page.correct")})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button variant="ghost" size="icon" onClick={() => handleEditQuestionClick(q)}>
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
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReadingSectionEditor;