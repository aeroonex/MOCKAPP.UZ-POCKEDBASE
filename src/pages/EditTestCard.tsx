"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import AppFooter from "@/components/AppFooter";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Volume2, BookText, PenSquare, Mic } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { IeltsTest } from "@/lib/types";
import ListeningSectionEditor from "@/components/ListeningSectionEditor"; // Yangi komponent
import ReadingSectionEditor from "@/components/ReadingSectionEditor";   // Yangi komponent
import WritingSectionEditor from "@/components/WritingSectionEditor";   // Yangi komponent
import SpeakingSectionDisplay from "@/components/SpeakingSectionDisplay"; // Yangi komponent
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SectionType = "Listening" | "Reading" | "Writing" | "Speaking";

const EditTestCard: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [test, setTest] = useState<IeltsTest | null>(null);
  const [sections, setSections] = useState<any[]>([]); // IELTS sections
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentSectionTab, setCurrentSectionTab] = useState<SectionType>("Listening");

  const fetchTestDetails = useCallback(async () => {
    setIsLoading(true);
    if (!testId) {
      showError(t("question_management_page.error_test_id_missing"));
      navigate("/add-question");
      return;
    }

    const { data: testData, error: testError } = await supabase
      .from('ielts_tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (testError) {
      showError(`${t("cefr_tests_page.error_loading_tests")} ${testError.message}`);
      navigate("/add-question");
      return;
    }
    setTest(testData);

    const { data: sectionsData, error: sectionsError } = await supabase
      .from('ielts_sections')
      .select('*')
      .eq('test_id', testId)
      .order('order', { ascending: true });

    if (sectionsError) {
      showError(`${t("question_management_page.error_loading_sections")} ${sectionsError.message}`);
      setSections([]);
    } else {
      setSections(sectionsData || []);
    }
    setIsLoading(false);
  }, [testId, navigate, t]);

  useEffect(() => {
    fetchTestDetails();
  }, [fetchTestDetails]);

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
        <p>{t("question_management_page.test_not_found")}</p>
      </div>
    );
  }

  const getSectionId = (type: SectionType) => sections.find(s => s.type === type)?.id;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto p-4">
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="pt-8">
            <div className="flex justify-between items-center">
              <Link to="/add-question">
                <Button variant="default" className="bg-primary hover:bg-primary/90">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t("common.back")}
                </Button>
              </Link>
              <CardTitle className="text-xl sm:text-3xl font-bold text-center flex-grow">
                {t("question_management_page.edit_test_card_title", { title: test.title })}
              </CardTitle>
              <div className="w-[80px] h-4"></div>
            </div>
            <CardDescription className="text-center mt-2">
              {t("question_management_page.edit_test_card_description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={currentSectionTab} onValueChange={(value) => setCurrentSectionTab(value as SectionType)} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="Listening" className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" /> {t("question_management_page.listening_section")}
                </TabsTrigger>
                <TabsTrigger value="Reading" className="flex items-center gap-2">
                  <BookText className="h-4 w-4" /> {t("question_management_page.reading_section")}
                </TabsTrigger>
                <TabsTrigger value="Writing" className="flex items-center gap-2">
                  <PenSquare className="h-4 w-4" /> {t("question_management_page.writing_section")}
                </TabsTrigger>
                <TabsTrigger value="Speaking" className="flex items-center gap-2">
                  <Mic className="h-4 w-4" /> {t("question_management_page.speaking_section")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="Listening" className="mt-4">
                <ListeningSectionEditor sectionId={getSectionId("Listening")} />
              </TabsContent>
              <TabsContent value="Reading" className="mt-4">
                <ReadingSectionEditor sectionId={getSectionId("Reading")} />
              </TabsContent>
              <TabsContent value="Writing" className="mt-4">
                <WritingSectionEditor sectionId={getSectionId("Writing")} />
              </TabsContent>
              <TabsContent value="Speaking" className="mt-4">
                <SpeakingSectionDisplay sectionId={getSectionId("Speaking")} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  );
};

export default EditTestCard;