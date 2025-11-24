"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import AppFooter from "@/components/AppFooter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Volume2, BookText, PenSquare, Mic, LayoutGrid } from "lucide-react"; // LayoutGrid iconini qo'shish
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import AddSpeakingQuestion from "@/components/AddSpeakingQuestion";
import AddListeningQuestion from "@/components/AddListeningQuestion";
import CreateTestCard from "@/components/CreateTestCard"; // Yangi komponentni import qilish
import { Button } from "@/components/ui/button";

type QuestionTypeTab = "speaking" | "listening" | "reading" | "writing" | "create-test-card"; // Yangi tab turi

const QuestionManagement: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<QuestionTypeTab>("speaking");
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto p-4">
        <Card className="max-w-3xl mx-auto">
          <CardHeader className="pt-8">
            <div className="flex justify-between items-center">
              <Link to="/home">
                <Button variant="default" className="bg-primary hover:bg-primary/90">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t("common.back")}
                </Button>
              </Link>
              <CardTitle className="text-xl sm:text-3xl font-bold text-center flex-grow">
                {t("question_management_page.title")}
              </CardTitle>
              <div className="w-[80px] h-4"></div> {/* Joyni to'ldirish uchun */}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as QuestionTypeTab)} className="w-full">
              <TabsList className="grid w-full grid-cols-5"> {/* Grid ustunlari sonini 5 ga o'zgartirish */}
                <TabsTrigger value="speaking" className="flex items-center gap-2">
                  <Mic className="h-4 w-4" /> {t("question_management_page.add_speaking")}
                </TabsTrigger>
                <TabsTrigger value="listening" className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" /> {t("question_management_page.add_listening")}
                </TabsTrigger>
                <TabsTrigger value="reading" className="flex items-center gap-2">
                  <BookText className="h-4 w-4" /> {t("question_management_page.add_reading")}
                </TabsTrigger>
                <TabsTrigger value="writing" className="flex items-center gap-2">
                  <PenSquare className="h-4 w-4" /> {t("question_management_page.add_writing")}
                </TabsTrigger>
                <TabsTrigger value="create-test-card" className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" /> {t("question_management_page.create_test_card")} {/* Yangi tab */}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="speaking" className="mt-4">
                <AddSpeakingQuestion />
              </TabsContent>
              <TabsContent value="listening" className="mt-4">
                <AddListeningQuestion />
              </TabsContent>
              <TabsContent value="reading" className="mt-4">
                <div className="p-4 border rounded-lg bg-card text-center text-muted-foreground">
                  {t("question_management_page.reading_section_placeholder")}
                </div>
              </TabsContent>
              <TabsContent value="writing" className="mt-4">
                <div className="p-4 border rounded-lg bg-card text-center text-muted-foreground">
                  {t("question_management_page.writing_section_placeholder")}
                </div>
              </TabsContent>
              <TabsContent value="create-test-card" className="mt-4"> {/* Yangi tab kontenti */}
                <CreateTestCard />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  );
};

export default QuestionManagement;