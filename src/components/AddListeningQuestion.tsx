"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { CompleteSectionQuestion, ListeningQuestionType } from "@/lib/types";

const AddListeningQuestion: React.FC = () => {
  const { user, session } = useAuth();
  const isGuestMode = localStorage.getItem("isGuestMode") === "true" && !session;
  const { t } = useTranslation();

  const [questionType, setQuestionType] = useState<ListeningQuestionType>("Complete Section");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [questionHtml, setQuestionHtml] = useState<string>("");
  const [answers, setAnswers] = useState<{ id: string; correct_answer: string }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState<boolean>(false);

  // HTML matnidan javob maydonlarini ajratib olish
  const extractAnswerFields = useCallback((html: string) => {
    const regex = /{([^}]+)}/g; // {answer_id} formatini topish
    const matches = [...html.matchAll(regex)];
    const extractedAnswers = matches.map(match => ({
      id: match[1],
      correct_answer: answers.find(a => a.id === match[1])?.correct_answer || "", // Agar mavjud bo'lsa, eski javobni saqlash
    }));
    setAnswers(extractedAnswers);
  }, [answers]);

  useEffect(() => {
    extractAnswerFields(questionHtml);
  }, [questionHtml, extractAnswerFields]);

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    if (!user) {
      showError(t("add_question_page.error_login_to_upload"));
      return;
    }

    setIsUploadingAudio(true);
    showSuccess(t("add_question_page.success_video_saving")); // Umumiy xabar

    const fileName = `${uuidv4()}-${file.name}`;
    const filePath = `${user.id}/listening-audios/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('listening-audios')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('listening-audios')
        .getPublicUrl(filePath);

      if (!data.publicUrl) {
        throw new Error(t("add_question_page.error_no_public_url"));
      }

      setAudioFile(file);
      setAudioUrl(data.publicUrl);
      showSuccess(t("add_question_page.success_video_saved")); // Umumiy xabar
    } catch (error: any) {
      showError(`${t("add_question_page.error_uploading_audio")} ${error.message}`);
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleAnswerChange = (id: string, value: string) => {
    setAnswers(prev => prev.map(ans => ans.id === id ? { ...ans, correct_answer: value } : ans));
  };

  const handleSubmit = async () => {
    if (isGuestMode) {
      showError(t("add_question_page.guest_mode_add_question_warning"));
      return;
    }
    if (!user) {
      showError(t("add_question_page.error_login_to_save"));
      return;
    }
    if (!audioUrl) {
      showError(t("add_question_page.error_upload_audio"));
      return;
    }
    if (!questionHtml.trim()) {
      showError(t("add_question_page.error_enter_question_html"));
      return;
    }
    if (answers.some(ans => !ans.correct_answer.trim())) {
      showError(t("add_question_page.error_fill_all_answers"));
      return;
    }

    setIsLoading(true);

    const newQuestion: Omit<CompleteSectionQuestion, 'id' | 'date' | 'user_id'> = {
      type: "Complete Section",
      audio_url: audioUrl,
      question_html: questionHtml,
      answers: answers.map(ans => ({ id: ans.id, correct_answer: ans.correct_answer.trim() })),
    };

    try {
      // Hozircha Supabasega saqlash funksiyasi yo'q, shuning uchun konsolga chiqaramiz
      console.log("New Listening Question to save:", newQuestion);
      // Real ilovada bu yerda Supabasega yozish logikasi bo'ladi
      // const { data, error } = await supabase.from('listening_questions').insert(newQuestion).select().single();
      // if (error) throw error;
      showSuccess(t("add_question_page.success_question_added_to_part", { part: t("question_management_page.add_listening") }));
      
      // Formani tozalash
      setAudioFile(null);
      setAudioUrl(null);
      setQuestionHtml("");
      setAnswers([]);

    } catch (error: any) {
      showError(`${t("add_question_page.error_saving_entry")} ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t("question_management_page.add_listening")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isGuestMode && (
          <div className="p-3 text-center bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-700 rounded-md text-yellow-800 dark:text-yellow-300">
            <p>{t("add_question_page.guest_mode_add_question_warning")}</p>
          </div>
        )}
        <fieldset disabled={isGuestMode || isLoading}>
          <div className="space-y-2">
            <Label htmlFor="question-type">{t("add_question_page.question_type")}</Label>
            <Select value={questionType} onValueChange={(value: ListeningQuestionType) => setQuestionType(value)} disabled>
              <SelectTrigger id="question-type">
                <SelectValue placeholder={t("add_question_page.select_question_type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Complete Section">{t("add_question_page.complete_section")}</SelectItem>
                {/* Kelajakda boshqa turlar qo'shilishi mumkin */}
              </SelectContent>
            </Select>
          </div>

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
            <Label htmlFor="question-html">{t("add_question_page.question_html_content")}</Label>
            <Textarea
              id="question-html"
              placeholder={t("add_question_page.enter_html_for_listening_question")}
              value={questionHtml}
              onChange={(e) => setQuestionHtml(e.target.value)}
              rows={10}
            />
            <p className="text-sm text-muted-foreground">
              {t("add_question_page.html_placeholder_info")}
            </p>
          </div>

          {questionType === "Complete Section" && answers.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">{t("add_question_page.correct_answers")}</h4>
              {answers.map((ans, index) => (
                <div key={ans.id} className="flex items-center gap-2">
                  <Label htmlFor={`answer-${ans.id}`} className="w-24 text-right">
                    {ans.id}:
                  </Label>
                  <Input
                    id={`answer-${ans.id}`}
                    type="text"
                    value={ans.correct_answer}
                    onChange={(e) => handleAnswerChange(ans.id, e.target.value)}
                    placeholder={t("add_question_page.enter_correct_answer_for", { id: ans.id })}
                  />
                </div>
              ))}
            </div>
          )}

          <Button onClick={handleSubmit} className="w-full" disabled={isLoading || isUploadingAudio}>
            {isLoading ? t("common.saving") : t("add_question_page.add_listening_question")}
          </Button>
        </fieldset>
      </CardContent>
    </Card>
  );
};

export default AddListeningQuestion;