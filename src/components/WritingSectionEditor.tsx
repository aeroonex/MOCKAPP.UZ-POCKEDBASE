"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { v4 as uuidv4 } from 'uuid';
import { Trash2, PlusCircle, PenSquare, Pencil, XCircle } from "lucide-react";
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

interface WritingRubric {
  id?: string;
  criterion: string;
  description: string;
  score_range: string;
}

interface WritingQuestion {
  id: string;
  question_text: string; // Writing task description
  word_limit: number;
  question_type: string; // 'writing_task'
  rubrics: WritingRubric[];
}

interface WritingSectionEditorProps {
  sectionId: string | undefined;
}

const WritingSectionEditor: React.FC<WritingSectionEditorProps> = ({ sectionId }) => {
  const { t } = useTranslation();

  const [questions, setQuestions] = useState<WritingQuestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingQuestion, setEditingQuestion] = useState<WritingQuestion | null>(null);

  // Form states
  const [writingTask, setWritingTask] = useState<string>("");
  const [wordLimit, setWordLimit] = useState<number>(150);
  const [rubrics, setRubrics] = useState<WritingRubric[]>([
    { criterion: t("question_management_page.task_achievement"), description: "", score_range: "0-9" },
    { criterion: t("question_management_page.coherence_cohesion"), description: "", score_range: "0-9" },
  ]);

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
        word_limit,
        question_type,
        ielts_rubrics (id, criterion, description, score_range)
      `)
      .eq('section_id', sectionId)
      .order('created_at', { ascending: true });

    if (error) {
      showError(`${t("question_management_page.error_loading_questions")} ${error.message}`);
      setQuestions([]);
    } else {
      setQuestions(data.map(q => ({
        ...q,
        rubrics: q.ielts_rubrics || []
      })) as WritingQuestion[]);
    }
    setIsLoading(false);
  }, [sectionId, t]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const resetForm = () => {
    setWritingTask("");
    setWordLimit(150);
    setRubrics([
      { criterion: t("question_management_page.task_achievement"), description: "", score_range: "0-9" },
      { criterion: t("question_management_page.coherence_cohesion"), description: "", score_range: "0-9" },
    ]);
    setEditingQuestion(null);
  };

  const handleRubricChange = (index: number, field: keyof WritingRubric, value: string) => {
    const newRubrics = [...rubrics];
    (newRubrics[index][field] as string) = value;
    setRubrics(newRubrics);
  };

  const addRubric = () => {
    setRubrics(prev => [...prev, { criterion: "", description: "", score_range: "0-9" }]);
  };

  const removeRubric = (index: number) => {
    setRubrics(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveQuestion = async () => {
    if (!sectionId) {
      showError(t("question_management_page.error_section_id_missing"));
      return;
    }
    if (!writingTask.trim() || wordLimit <= 0 || rubrics.some(r => !r.criterion.trim() || !r.description.trim())) {
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
            question_text: writingTask.trim(),
            word_limit: wordLimit,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingQuestion.id);
        if (qError) throw qError;

        // Update rubrics
        await Promise.all(rubrics.map(async (rub, index) => {
          if (rub.id) { // Existing rubric
            await supabase
              .from('ielts_rubrics')
              .update({ criterion: rub.criterion.trim(), description: rub.description.trim(), score_range: rub.score_range, updated_at: new Date().toISOString() })
              .eq('id', rub.id);
          } else { // New rubric
            await supabase
              .from('ielts_rubrics')
              .insert({ question_id: editingQuestion.id, criterion: rub.criterion.trim(), description: rub.description.trim(), score_range: rub.score_range });
          }
        }));
        // Delete removed rubrics (if any)
        const existingRubricIds = new Set(rubrics.filter(r => r.id).map(r => r.id));
        const rubricsToDelete = editingQuestion.rubrics.filter(r => !existingRubricIds.has(r.id));
        if (rubricsToDelete.length > 0) {
          await supabase.from('ielts_rubrics').delete().in('id', rubricsToDelete.map(r => r.id));
        }

        showSuccess(t("question_management_page.question_updated_successfully"));
      } else {
        // Create new question
        const { data: newQuestion, error: qError } = await supabase
          .from('ielts_questions')
          .insert({
            section_id: sectionId,
            question_text: writingTask.trim(),
            word_limit: wordLimit,
            question_type: 'writing_task',
          })
          .select()
          .single();
        if (qError) throw qError;

        await supabase
          .from('ielts_rubrics')
          .insert(rubrics.map(rub => ({
            question_id: newQuestion.id,
            criterion: rub.criterion.trim(),
            description: rub.description.trim(),
            score_range: rub.score_range,
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

  const handleEditQuestionClick = (question: WritingQuestion) => {
    setEditingQuestion(question);
    setWritingTask(question.question_text);
    setWordLimit(question.word_limit);
    setRubrics(question.rubrics.map(rub => ({ id: rub.id, criterion: rub.criterion, description: rub.description, score_range: rub.score_range })));
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
          <PenSquare className="h-6 w-6" /> {t("question_management_page.writing_section")}
        </CardTitle>
        <CardDescription>{t("question_management_page.writing_section_description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <fieldset disabled={isLoading}>
          <div className="space-y-2">
            <Label htmlFor="writing-task">{t("question_management_page.writing_task")}</Label>
            <Textarea
              id="writing-task"
              placeholder={t("question_management_page.enter_writing_task")}
              value={writingTask}
              onChange={(e) => setWritingTask(e.target.value)}
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="word-limit">{t("question_management_page.word_limit")}</Label>
            <Input
              id="word-limit"
              type="number"
              placeholder="150"
              value={wordLimit}
              onChange={(e) => setWordLimit(parseInt(e.target.value) || 0)}
              min={1}
            />
          </div>

          <div className="space-y-4">
            <Label className="text-base">{t("question_management_page.rubric_fields")}</Label>
            {rubrics.map((rubric, index) => (
              <Card key={index} className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`criterion-${index}`}>{t("question_management_page.criterion")}</Label>
                  {rubrics.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeRubric(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <Input
                  id={`criterion-${index}`}
                  type="text"
                  placeholder={t("question_management_page.enter_criterion")}
                  value={rubric.criterion}
                  onChange={(e) => handleRubricChange(index, 'criterion', e.target.value)}
                />
                <Label htmlFor={`description-${index}`}>{t("question_management_page.description")}</Label>
                <Textarea
                  id={`description-${index}`}
                  placeholder={t("question_management_page.enter_description_for_criterion")}
                  value={rubric.description}
                  onChange={(e) => handleRubricChange(index, 'description', e.target.value)}
                  rows={2}
                />
                <Label htmlFor={`score-range-${index}`}>{t("question_management_page.score_range")}</Label>
                <Input
                  id={`score-range-${index}`}
                  type="text"
                  placeholder="0-9"
                  value={rubric.score_range}
                  onChange={(e) => handleRubricChange(index, 'score_range', e.target.value)}
                />
              </Card>
            ))}
            <Button variant="outline" onClick={addRubric} className="w-full">
              <PlusCircle className="h-4 w-4 mr-2" /> {t("question_management_page.add_rubric")}
            </Button>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleSaveQuestion} className="w-full" disabled={isLoading}>
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
                    <p className="font-semibold">{t("question_management_page.task")}: {q.question_text}</p>
                    <p className="text-sm text-muted-foreground">{t("question_management_page.word_limit")}: {q.word_limit}</p>
                    <h4 className="font-medium mt-2">{t("question_management_page.rubrics")}:</h4>
                    <ul className="list-disc list-inside text-sm">
                      {q.rubrics.map((rub, idx) => (
                        <li key={idx}>
                          <strong>{rub.criterion} ({rub.score_range}):</strong> {rub.description}
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

export default WritingSectionEditor;