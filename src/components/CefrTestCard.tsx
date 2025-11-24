"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { format } from "date-fns";
import { CEFRTest } from "@/lib/types"; // Yangi CEFRTest interfeysini import qilish
import { useTranslation } from 'react-i18next';

interface CefrTestCardProps {
  test: CEFRTest; // CEFRTest tipidan foydalanish
  onSelectTest: (testId: string) => void;
}

const CefrTestCard: React.FC<CefrTestCardProps> = ({ test, onSelectTest }) => {
  const { t } = useTranslation();
  const formattedDate = format(new Date(test.created_at), "PPP");

  return (
    <Card className="group bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-xl hover:scale-105 hover:border-indigo-400/50 hover:shadow-indigo-500/40 hover:shadow-2xl transition-all duration-500 cursor-pointer">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold flex items-center gap-2 text-foreground">
          <BookOpen className="h-6 w-6 text-primary" />
          {test.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-4">
        <p className="text-sm text-muted-foreground">
          {t("cefr_tests_page.created_at")}: {formattedDate}
        </p>
        <Button 
          onClick={() => onSelectTest(test.id)} 
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold"
        >
          {t("cefr_tests_page.select_test")}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CefrTestCard;