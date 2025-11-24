"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import AppFooter from "@/components/AppFooter";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlayCircle, Volume2, BookText, PenSquare, Mic } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { IeltsTest, CEFRSection } from "@/lib/types";

const StartCefrTest: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [test, setTest] = useState<IeltsTest | null>(null);
  const [sections, setSections] = useState<CEFRSection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchTestDetails = useCallback(async () => {
    setIsLoading(true);
    if (!testId) {
      showError(t("cefr_start_test_page.error_test_id_missing"));
      navigate("/cefr-tests");
      return;
    }

    const { data: testData, error: testError } = await supabase
      .from('cefr_tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (testError) {
      showError(`${t("cefr_start_test_page.error_loading_test_details")} ${testError.message}`);
      navigate("/cefr-tests");
      return;
    }
    setTest(testData);

    const { data: sectionsData, error: sectionsError } = await supabase
      .from('cefr_sections')
      .select('*')
      .eq('test_id', testId)
      .order('order', { ascending: true });

    if (sectionsError) {
      showError(`${t("cefr_start_test_page.error_loading_sections")} ${sectionsError.message}`);
      setSections([]);
    } else {
      setSections(sectionsData || []);
    }
    setIsLoading(false);
  }, [testId, navigate, t]);

  useEffect(() => {
    fetchTestDetails();
  }, [fetchTestDetails]);

  const handleStartTest = () => {
    if (testId) {
      navigate(`/mock-test`, { state: { cefrTestId: testId } });
    } else {
      showError(t("cefr_start_test_page.error_test_id_missing"));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t("cefr_start_test_page.test_not_found")}</p>
      </div>
    );
  }

  const getSectionIcon = (type: string) => {
    switch (type) {
      case "Listening": return <Volume2 className="h-5 w-5 text-primary" />;
      case "Reading": return <BookText className="h-5 w-5 text-primary" />;
      case "Writing": return <PenSquare className="h-5 w-5 text-primary" />;
      case "Speaking": return <Mic className="h-5 w-5 text-primary" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto p-4 flex items-center justify-center">
        <Card className="w-full max-w-3xl">
          <CardHeader className="pt-8">
            <div className="flex justify-between items-center">
              <Link to="/cefr-tests">
                <Button variant="default" className="bg-primary hover:bg-primary/90">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t("common.back")}
                </Button>
              </Link>
              <CardTitle className="text-xl sm:text-3xl font-bold text-center flex-grow">
                {test.title}
              </CardTitle>
              <div className="w-[80px] h-4"></div>
            </div>
            <CardDescription className="text-center mt-2">
              {t("cefr_start_test_page.test_details_description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">{t("cefr_start_test_page.sections_included")}</h3>
              {sections.length === 0 ? (
                <p className="text-muted-foreground">{t("cefr_start_test_page.no_sections_found")}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sections.map((section) => (
                    <div key={section.id} className="flex items-center gap-3 p-3 border rounded-md bg-secondary">
                      {getSectionIcon(section.type)}
                      <span className="font-medium">{section.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleStartTest} className="w-full text-lg py-3">
              <PlayCircle className="h-5 w-5 mr-2" /> {t("cefr_start_test_page.start_test")}
            </Button>
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  );
};

export default StartCefrTest;