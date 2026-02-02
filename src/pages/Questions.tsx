"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import AppFooter from "@/components/AppFooter"; // Yangi import
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SpeakingQuestion, SpeakingPart } from "@/lib/types";
import { allSpeakingParts } from "@/lib/constants";
import { format } from "date-fns";
import { getSupabaseQuestions } from "@/lib/local-db";
import { useAuth } from "@/context/AuthProvider";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile

const Questions: React.FC = () => {
  const { session } = useAuth();
  const [questions, setQuestions] = useState<Record<SpeakingPart, SpeakingQuestion[]>>({
    "Part 1.1": [], "Part 1.2": [], "Part 2": [], "Part 3": [],
  });
  const [isLoading, setIsLoading] = useState(true);
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
    setQuestions(groupedQuestions);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (session) {
      loadQuestions();
    }
  }, [session, loadQuestions]);

  const renderQuestionContent = (q: SpeakingQuestion) => {
    switch (q.type) {
      case "Part 1.1":
        return (
          <div className="flex flex-col">
            <p className="text-sm font-semibold">{t("add_question_page.questions")}:</p>
            <ul className="list-disc list-inside text-xs">
              {q.sub_questions?.map((subQ, i) => <li key={i}>{subQ}</li>) ?? <li className="text-yellow-500">{t("add_question_page.no_sub_questions")}</li>}
            </ul>
          </div>
        );
      case "Part 1.2":
        return (
          <div className="flex flex-col sm:flex-row sm:items-center">
            {q.image_urls && q.image_urls.length > 0 && (
              <div className="flex gap-2 mr-4 mb-2 sm:mb-0">
                {q.image_urls.map((url, idx) => <img key={idx} src={url} alt="" className="max-h-16 object-contain rounded-md" />)}
              </div>
            )}
            <div className="flex flex-col">
              <p className="text-sm font-semibold">{t("add_question_page.questions")}:</p>
              <ul className="list-disc list-inside text-xs">
                {q.sub_questions?.map((subQ, i) => <li key={i}>{subQ}</li>) ?? <li className="text-yellow-500">{t("add_question_page.no_sub_questions")}</li>}
              </ul>
            </div>
          </div>
        );
      case "Part 2":
        return (
          <div className="flex flex-col sm:flex-row sm:items-center">
            {q.image_urls && q.image_urls.length > 0 && (
              <div className="flex gap-2 mr-4 mb-2 sm:mb-0">
                {q.image_urls.map((url, idx) => <img key={idx} src={url} alt="" className="max-h-16 object-contain rounded-md" />)}
              </div>
            )}
            <p className="text-sm">{q.question_text ?? <span className="text-yellow-500">{t("add_question_page.no_question_text")}</span>}</p>
          </div>
        );
      case "Part 3":
        return (
          <div className="flex flex-col sm:flex-row sm:items-center">
            <p className="text-sm mr-4">{q.question_text ?? <span className="text-yellow-500">{t("add_question_page.no_question_text")}</span>}</p>
            {q.image_urls && q.image_urls.length > 0 && (
              <div className="flex gap-2">
                {q.image_urls.map((url, idx) => <img key={idx} src={url} alt="" className="max-h-16 object-contain rounded-md" />)}
              </div>
            )}
          </div>
        );
      default:
        return <p className="text-sm">{t("add_question_page.error_unknown_question_type")}</p>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto p-4">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex justify-between items-center">
              <Link to="/home">
                <Button variant="default" className="bg-primary hover:bg-primary/90">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t("common.back")}
                </Button>
              </Link>
              <CardTitle className="text-xl sm:text-3xl font-bold text-center flex-grow">
                {t("home_page.questions")}
              </CardTitle>
              {/* Joyni to'ldirish uchun bo'sh div */}
              <div className="w-[80px] h-4"></div> 
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <p className="text-center">{t("common.loading")}</p> : allSpeakingParts.map((part, index) => (
              <div key={part} className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">{part} {t("add_question_page.questions")}</h2>
                {questions[part].length === 0 ? (
                  <p className="text-center text-muted-foreground">{t("add_question_page.no_questions_added")}</p>
                ) : (
                  <div className="space-y-3">
                    {questions[part].map((q) => (
                      <div key={q.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-md bg-secondary text-secondary-foreground">
                        <div className="flex-grow mb-2 sm:mb-0 sm:mr-4">{renderQuestionContent(q)}</div>
                        <div className="flex flex-col items-end text-xs text-muted-foreground whitespace-nowrap">
                          {q.id && <span>ID: {q.id.substring(0, 8)}...</span>}
                          {q.date && <span>{t("add_question_page.added")}: {format(new Date(q.date), "MMM dd, yyyy HH:mm")}</span>}
                          {q.last_used && (
                            <span>{t("add_question_page.last_used_full")}: {format(new Date(q.last_used), "MMM dd, yyyy HH:mm")}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {index < allSpeakingParts.length - 1 && <Separator className="my-6" />}
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
      {!isMobile && <AppFooter />} {/* Conditionally render AppFooter */}
    </div>
  );
};

export default Questions;