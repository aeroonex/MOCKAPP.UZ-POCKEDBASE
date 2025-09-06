"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { CefrCentreFooter } from "@/components/CefrCentreFooter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SpeakingQuestion, SpeakingPart } from "@/lib/types";
import { allSpeakingParts } from "@/lib/constants";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { showError } from "@/utils/toast";

const Questions: React.FC = () => {
  const [questions, setQuestions] = useState<Record<SpeakingPart, SpeakingQuestion[]>>({
    "Part 1.1": [],
    "Part 1.2": [],
    "Part 2": [],
    "Part 3": [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('speaking_questions')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      showError(`Savollarni yuklashda xatolik: ${error.message}`);
    } else if (data) {
      const groupedQuestions: Record<SpeakingPart, SpeakingQuestion[]> = {
        "Part 1.1": [], "Part 1.2": [], "Part 2": [], "Part 3": [],
      };
      data.forEach((q: any) => {
        if (groupedQuestions[q.type as SpeakingPart]) {
          groupedQuestions[q.type as SpeakingPart].push(q);
        }
      });
      setQuestions(groupedQuestions);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const renderQuestionContent = (q: SpeakingQuestion) => {
    switch (q.type) {
      case "part1.1":
        return (
          <div className="flex flex-col">
            <p className="text-sm font-semibold">Savollar:</p>
            <ul className="list-disc list-inside text-xs">
              {q.sub_questions.map((subQ, i) => <li key={i}>{subQ}</li>)}
            </ul>
          </div>
        );
      case "part1.2":
        return (
          <div className="flex flex-col sm:flex-row sm:items-center">
            <div className="flex gap-2 mr-4 mb-2 sm:mb-0">
              {q.image_urls.map((url, idx) => <img key={idx} src={url} alt="" className="max-h-16 object-contain rounded-md" />)}
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-semibold">Savollar:</p>
              <ul className="list-disc list-inside text-xs">
                {q.sub_questions.map((subQ, i) => <li key={i}>{subQ}</li>)}
              </ul>
            </div>
          </div>
        );
      case "part2":
        return (
          <div className="flex flex-col sm:flex-row sm:items-center">
            <div className="flex gap-2 mr-4 mb-2 sm:mb-0">
              {q.image_urls.map((url, idx) => <img key={idx} src={url} alt="" className="max-h-16 object-contain rounded-md" />)}
            </div>
            <p className="text-sm">{q.question_text}</p>
          </div>
        );
      case "part3":
        return (
          <div className="flex flex-col sm:flex-row sm:items-center">
            <p className="text-sm mr-4">{q.question_text}</p>
            <div className="flex gap-2">
              {q.image_urls.map((url, idx) => <img key={idx} src={url} alt="" className="max-h-16 object-contain rounded-md" />)}
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
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Barcha Speaking Savollari</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <p className="text-center">Yuklanmoqda...</p> : allSpeakingParts.map((part, index) => (
              <div key={part} className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">{part} savollari</h2>
                {questions[part].length === 0 ? (
                  <p className="text-center text-muted-foreground">Bu bo'lim uchun hali savollar qo'shilmagan.</p>
                ) : (
                  <div className="space-y-3">
                    {questions[part].map((q) => (
                      <div key={q.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-md bg-secondary text-secondary-foreground">
                        <div className="flex-grow mb-2 sm:mb-0 sm:mr-4">{renderQuestionContent(q)}</div>
                        <div className="flex flex-col items-end text-xs text-muted-foreground whitespace-nowrap">
                          <span>ID: {q.id.substring(0, 8)}...</span>
                          <span>Qo'shilgan: {format(new Date(q.date), "MMM dd, yyyy HH:mm")}</span>
                          {q.last_used && (
                            <span>Oxirgi ishlatilgan: {format(new Date(q.last_used), "MMM dd, yyyy HH:mm")}</span>
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
      <CefrCentreFooter />
    </div>
  );
};

export default Questions;