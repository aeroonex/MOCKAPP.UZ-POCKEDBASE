"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { v4 as uuidv4 } from 'uuid';
import { Link } from "react-router-dom";
import { Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react";
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
import { IeltsTest } from "@/lib/types";

const CreateTestCard: React.FC = () => {
  const { t } = useTranslation();
  const { user, session } = useAuth();
  const isGuestMode = localStorage.getItem("isGuestMode") === "true" && !session;

  const [testTitle, setTestTitle] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tests, setTests] = useState<IeltsTest[]>([]);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);

  const fetchTests = useCallback(async () => {
    setIsLoading(true);
    if (!user) {
      setTests([]);
      setIsLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('ielts_tests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      showError(`${t("cefr_tests_page.error_loading_tests")} ${error.message}`);
      setTests([]);
    } else {
      setTests(data || []);
    }
    setIsLoading(false);
  }, [user, t]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const resetForm = () => {
    setTestTitle("");
    setIsActive(false);
    setEditingTestId(null);
  };

  const handleCreateOrUpdateTest = async () => {
    if (isGuestMode) {
      showError(t("add_question_page.guest_mode_add_question_warning"));
      return;
    }
    if (!user) {
      showError(t("add_question_page.error_login_to_save"));
      return;
    }
    if (!testTitle.trim()) {
      showError(t("add_question_page.error_fill_all_fields"));
      return;
    }

    setIsLoading(true);
    try {
      if (editingTestId) {
        // Update existing test
        const { error } = await supabase
          .from('ielts_tests')
          .update({ title: testTitle.trim(), is_active: isActive, updated_at: new Date().toISOString() })
          .eq('id', editingTestId)
          .eq('user_id', user.id);

        if (error) throw error;
        showSuccess(t("question_management_page.test_updated_successfully"));
      } else {
        // Create new test
        const newTestId = uuidv4();
        const { data: newTest, error: testError } = await supabase
          .from('ielts_tests')
          .insert({ id: newTestId, user_id: user.id, title: testTitle.trim(), is_active: isActive })
          .select()
          .single();

        if (testError) throw testError;

        // Auto-create sections for the new test
        const sectionsToCreate = [
          { type: 'Listening', order: 1 },
          { type: 'Reading', order: 2 },
          { type: 'Writing', order: 3 },
          { type: 'Speaking', order: 4 },
        ];

        const { error: sectionsError } = await supabase
          .from('ielts_sections')
          .insert(sectionsToCreate.map(s => ({
            test_id: newTestId,
            type: s.type,
            order: s.order,
          })));

        if (sectionsError) throw sectionsError;

        // Auto-create system-generated Speaking questions
        const speakingSection = (await supabase.from('ielts_sections').select('id').eq('test_id', newTestId).eq('type', 'Speaking').single()).data;
        if (speakingSection) {
          const systemSpeakingQuestions = [
            {
              section_id: speakingSection.id,
              question_text: "Part 1.1: What is your hometown like?",
              question_type: "system_generated_part1_1",
              sub_questions: ["Where do you live?", "Can you describe your family?", "What are your hobbies?"]
            },
            {
              section_id: speakingSection.id,
              question_text: "Part 2: Describe a time you helped someone.",
              question_type: "system_generated_part2",
              image_urls: ["https://via.placeholder.com/150/0000FF/FFFFFF?text=Cue+Card"],
            },
            {
              section_id: speakingSection.id,
              question_text: "Part 3: Let's discuss helping others in society.",
              question_type: "system_generated_part3",
            }
          ];
          const { error: speakingQError } = await supabase
            .from('ielts_questions')
            .insert(systemSpeakingQuestions);
          if (speakingQError) throw speakingQError;
        }

        showSuccess(t("question_management_page.test_card_created_successfully"));
      }
      resetForm();
      fetchTests();
    } catch (error: any) {
      showError(`${t("common.error_saving_entry")} ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (test: IeltsTest) => {
    setEditingTestId(test.id);
    setTestTitle(test.title);
    setIsActive(test.is_active);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTest = async (testId: string) => {
    if (isGuestMode) {
      showError(t("add_question_page.guest_mode_add_question_warning"));
      return;
    }
    if (!user) {
      showError(t("add_question_page.error_login_to_save"));
      return false;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('ielts_tests')
        .delete()
        .eq('id', testId)
        .eq('user_id', user.id);

      if (error) throw error;
      showSuccess(t("question_management_page.test_deleted_successfully"));
      fetchTests();
      if (editingTestId === testId) {
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
        <CardTitle>{t("question_management_page.create_test_card")}</CardTitle>
        <CardDescription>{t("question_management_page.create_test_card_description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isGuestMode && (
          <div className="p-3 text-center bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-700 rounded-md text-yellow-800 dark:text-yellow-300">
            <p>{t("add_question_page.guest_mode_add_question_warning")}</p>
          </div>
        )}
        <fieldset disabled={isGuestMode || isLoading}>
          <div className="space-y-2">
            <Label htmlFor="test-title">{t("question_management_page.test_title")}</Label>
            <Input
              id="test-title"
              type="text"
              placeholder={t("question_management_page.test_title_placeholder")}
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="is-active">{t("question_management_page.is_active")}</Label>
            <Switch
              id="is-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreateOrUpdateTest} className="w-full" disabled={isLoading}>
              {isLoading ? t("common.saving") : (editingTestId ? t("common.save_changes") : t("question_management_page.create_test"))}
            </Button>
            {editingTestId && (
              <Button variant="outline" onClick={resetForm} disabled={isLoading}>
                <XCircle className="h-4 w-4 mr-2" /> {t("add_question_page.cancel")}
              </Button>
            )}
          </div>
        </fieldset>

        <h3 className="text-xl font-semibold mt-8">{t("question_management_page.your_test_cards")}</h3>
        {isLoading ? (
          <p className="text-center">{t("common.loading")}</p>
        ) : tests.length === 0 ? (
          <p className="text-muted-foreground text-center">{t("question_management_page.no_test_cards_yet")}</p>
        ) : (
          <div className="space-y-4">
            {tests.map((test) => (
              <Card key={test.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <div className="flex-grow mb-2 sm:mb-0">
                  <h4 className="font-semibold text-lg flex items-center gap-2">
                    {test.title}
                    {test.is_active ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" title={t("question_management_page.active")} />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" title={t("question_management_page.inactive")} />
                    )}
                  </h4>
                  <p className="text-sm text-muted-foreground">ID: {test.id.substring(0, 8)}...</p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/edit-test-card/${test.id}`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="h-4 w-4 mr-2" /> {t("common.open")}
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => handleEditClick(test)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("question_management_page.delete_test_confirm_title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("question_management_page.delete_test_confirm_description")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("add_question_page.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteTest(test.id)}>{t("add_question_page.delete")}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CreateTestCard;