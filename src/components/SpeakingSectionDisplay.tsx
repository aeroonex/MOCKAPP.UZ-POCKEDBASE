"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Mic } from "lucide-react";
import { SpeakingQuestion } from "@/lib/types";

interface SpeakingSectionDisplayProps {
  sectionId: string | undefined;
}

const SpeakingSectionDisplay: React.FC<SpeakingSectionDisplayProps> = ({ sectionId }) => {
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<SpeakingQuestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSpeakingQuestions = useCallback(async () => {
    setIsLoading(true);
    if (!sectionId) {
      setQuestions([]);
      setIsLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('ielts_questions')
      .select('*')
      .eq('section_id', sectionId)
      .order('created_at', { ascending: true });

    if (error) {
      showError(`${t("question_management_page.error_loading_questions")} ${error.message}`);
      setQuestions([]);
    } else {
      setQuestions(data as SpeakingQuestion[]);
    }
    setIsLoading(false);
  }, [sectionId, t]);

  useEffect(() => {
    fetchSpeakingQuestions();
  }, [fetchSpeakingQuestions]);

  const renderQuestionContent = (q: SpeakingQuestion) => {
    switch (q.question_type) {
      case "system_generated_part1_1":
        return (
          <div>
            <p className="font-semibold">{q.question_text}</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground">
              {(q as any).sub_questions?.map((subQ: string, i: number) => <li key={i}>{subQ}</li>)}
            </ul>
          </div>
        );
      case "system_generated_part2":
        return (
          <div>
            <p className="font-semibold">{q.question_text}</p>
            {q.image_urls && q.image_urls.length > 0 && (
              <div className="flex gap-2 mt-2">
                {q.image_urls.map((url, idx) => <img key={idx} src={url} alt="" className="max-h-24 object-contain rounded-md" />)}
              </div>
            )}
          </div>
        );
      case "system_generated_part3":
        return (
          <div>
            <p className="font-semibold">{q.question_text}</p>
          </div>
        );
      default:
        return <p className="text-sm text-red-500">{t("add_question_page.error_unknown_question_type")}</p>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-6 w-6" /> {t("question_management_page.speaking_section")}
        </CardTitle>
        <CardDescription>{t("question_management_page.speaking_section_description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-400 dark:border-blue-700 rounded-md text-blue-800 dark:text-blue-300">
          <p className="font-semibold">{t("question_management_page.speaking_section_info")}</p>
          <p className="text-sm mt-2">{t("question_management_page.speaking_section_auto_generated")}</p>
        </div>

        <h3 className="text-xl font-semibold mt-8">{t("question_management_page.system_generated_questions")}</h3>
        {isLoading ? (
          <p className="text-center">{t("common.loading")}</p>
        ) : questions.length === 0 ? (
          <p className="text-muted-foreground text-center">{t("question_management_page.no_system_questions_found")}</p>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => (
              <Card key={q.id} className="p-4 bg-secondary text-secondary-foreground">
                {renderQuestionContent(q)}
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SpeakingSectionDisplay;