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
import { Trash2, PlusCircle, Volume2, Pencil, XCircle } from "lucide-react";

interface ListeningQuestion {
  id: string;
  question_text: string;
  audio_url: string;
  question_type: string; // 'multiple_choice'
  options: { id: string; option_text: string; is_correct: boolean }[];
}

interface ListeningSectionEditorProps {
  sectionId: string | undefined;
}

const ListeningSectionEditor: React.FC<ListeningSectionEditorProps> = ({ sectionId }) => {
  const { t } = useTranslation();

  const [questions, setQuestions] = useState<ListeningQuestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingQuestion, setEditingQuestion] = useState<ListeningQuestion | null>(null);

  // Form states
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState<string>("");
  const [options, setOptions] = useState<{ text: string; isCorrect: boolean }[]>([
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);
  const [isUploadingAudio, setIsUploadingAudio] = useState<boolean>(false);

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    if (!sectionId) {
      setQuestions([]);
      setIsLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('ielts_questions')
      .select(`
        id,
        question_text,
        audio_url,
        question_type,
        ielts_options (id, option_text, is_correct)
      `)
      .eq('section_id', sectionId)
      .order('created_at', { ascending: true });

    if (error) {
      showError(`${t("question_management_page.error_loading_questions")} ${error.message}`);
      setQuestions([]);
    } else {
      setQuestions(data.map(q => ({
        ...q,
        options: q.ielts_options || []
      })) as ListeningQuestion[]);
    }
    setIsLoading(false);
  }, [sectionId, t]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const resetForm = () => {
    setAudioFile(null);
    setAudioUrl(null);
    setQuestionText("");
    setOptions([
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ]);
    setEditingQuestion(null);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    setIsUploadingAudio(true);
    showSuccess(t("add_question_page.success_video_saving"));

    const fileName = `${uuidv4()}-${file.name}`;
    const filePath = `${supabase.auth.getUser().then(u => u.data.user?.id)}/ielts-audios/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('ielts-audios')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('ielts-audios')
        .getPublicUrl(filePath);

      if (!data.publicUrl) {
        throw new Error(t("add_question_page.error_no_public_url"));
      }

      setAudioFile(file);
      setAudioUrl(data.publicUrl);
      showSuccess(t("add_question_page.success_video_saved"));
    } catch (error: any) {
      showError(`${t("add_question_page.error_uploading_audio")} ${error.message}`);
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleOptionChange = (index: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    const newOptions = [...options];
    if (field === 'isCorrect') {
      // Only one option can be correct for multiple choice
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
    if (!audioUrl || !questionText.trim() || options.length < 2 || options.every(opt => !opt.text.trim()) || options.every(opt => !opt.isCorrect)) {
      showError(t("add_question_page.error_fill_all_fields"));
      return;
    }

    setIsLoading(true);
    try {
      if (editingQuestion) {
        // Update existing question
        const { error: qError } = await supabase
          .from('ielts_questions')
          .update({
            question_text: questionText.trim(),
            audio_url: audioUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingQuestion.id);
        if (qError) throw qError;

        // Update options
        await Promise.all(options.map(async (opt, index) => {
          if (opt.id) { // Existing option
            await supabase
              .from('ielts_options')
              .update({ option_text: opt.text.trim(), is_correct: opt.isCorrect, updated_at: new Date().toISOString() })
              .eq('id', opt.id);
          } else { // New option
            await supabase
              .from('ielts_options')
              .insert({ question_id: editingQuestion.id, option_text: opt.text.trim(), is_correct: opt.isCorrect });
          }
        }));
        // Delete removed options (if any)
        const existingOptionIds = new Set(options.filter(o => o.id).map(o => o.id));
        const optionsToDelete = editingQuestion.options.filter(o => !existingOptionIds.has(o.id));
        if (optionsToDelete.length > 0) {
          await supabase.from('ielts_options').delete().in('id', optionsToDelete.map(o => o.id));
        }

        showSuccess(t("question_management_page.question_updated_successfully"));
      } else {
        // Create new question
        const { data: newQuestion, error: qError } = await supabase
          .from('ielts_questions')
          .insert({
            section_id: sectionId,
            question_text: questionText.trim(),
            audio_url: audioUrl,
            question_type: 'multiple_choice',
          })
          .select()
          .single();
        if (qError) throw qError;

        await supabase
          .from('ielts_options')
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

  const handleEditQuestionClick = (question: ListeningQuestion) => {
    setEditingQuestion(question);
    setAudioUrl(question.audio_url);
    setQuestionText(question.question_text);
    setOptions(question.options.map(opt => ({ id: opt.id, text: opt.option_text, isCorrect: opt.is_correct })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteQuestion = async (questionId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('ielts_questions')
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
          <Volume2 className="h-6 w-6" /> {t("question_management_page.listening_section")}
        </CardTitle>
        <CardDescription>{t("question_management_page.listening_section_description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <fieldset disabled={isLoading}>
          <div className="space-y-2">
            <Label htmlFor="audio-upload">{t("add_question_page.upload_audio")}</Label>
            <Input
              id="audio-upload"
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              disabled={isUploadingAudio}
            />
            {isUploadingAudio && <p className="text-sm text-muted-foreground">{t("add_question_page.uploading_audio")}</p>}
            {audioUrl && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground">{t("add_question_page.audio_preview")}</p>
                <audio controls src={audioUrl} className="w-full"></audio>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="question-text">{t("add_question_page.main_question")}</Label>
            <Textarea
              id="question-text"
              placeholder={t("question_management_page.enter_listening_question_text")}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
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
            <Button onClick={handleSaveQuestion} className="w-full" disabled={isLoading || isUploadingAudio}>
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
                    <p className="font-semibold">{q.question_text}</p>
                    {q.audio_url && <audio controls src={q.audio_url} className="w-full mt-2"></audio>}
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

export default ListeningSectionEditor;