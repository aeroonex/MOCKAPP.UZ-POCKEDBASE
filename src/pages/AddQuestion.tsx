"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showSuccess, showError } from "@/utils/toast";
import { v4 as uuidv4 } from "uuid";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import {
  SpeakingQuestion,
  SpeakingPart,
  Part1Question,
  Part1_1Question,
  Part1_2Question,
  Part2Question,
  Part3Question,
} from "@/lib/types";
import { allSpeakingParts, getSpeakingQuestionStorageKey } from "@/lib/constants";
import { supabase } from "@/lib/supabase"; // Import Supabase client

const SpeakingQuestionManager: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<SpeakingPart>("Part 1");
  const [questionText, setQuestionText] = useState<string>("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [subQuestionsText, setSubQuestionsText] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const [questions, setQuestions] = useState<Record<SpeakingPart, SpeakingQuestion[]>>({
    "Part 1": [],
    "Part 1.1": [],
    "Part 1.2": [],
    "Part 2": [],
    "Part 3": [],
  });

  useEffect(() => {
    const loadedQuestions: Record<SpeakingPart, SpeakingQuestion[]> = {
      "Part 1": [],
      "Part 1.1": [],
      "Part 1.2": [],
      "Part 2": [],
      "Part 3": [],
    };
    allSpeakingParts.forEach(part => {
      const storageKey = getSpeakingQuestionStorageKey(part);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        loadedQuestions[part] = JSON.parse(stored);
      }
    });
    setQuestions(loadedQuestions);
  }, []);

  useEffect(() => {
    allSpeakingParts.forEach(part => {
      const storageKey = getSpeakingQuestionStorageKey(part);
      localStorage.setItem(storageKey, JSON.stringify(questions[part]));
    });
  }, [questions]);

  const uploadImageToSupabase = async (file: File): Promise<string | null> => {
    if (!file) return null;

    const fileExtension = file.name.split('.').pop();
    const filePath = `${uuidv4()}.${fileExtension}`; // Unique file name
    
    try {
      const { data, error } = await supabase.storage
        .from('question-images') // Ensure this bucket exists in Supabase
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from('question-images')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;

    } catch (error: any) {
      console.error("Error uploading image to Supabase:", error.message);
      showError(`Rasmni yuklashda xatolik yuz berdi: ${error.message}`);
      return null;
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newImageFiles = [...imageFiles];
      newImageFiles[index] = file;
      setImageFiles(newImageFiles);
      setIsUploading(true);
      // Removed toastId from showSuccess/showError as they don't support it directly
      showSuccess("Rasm yuklanmoqda..."); 

      try {
        const publicUrl = await uploadImageToSupabase(file);
        if (publicUrl) {
          const newImagePreviewUrls = [...imagePreviewUrls];
          newImagePreviewUrls[index] = publicUrl;
          setImagePreviewUrls(newImagePreviewUrls);
          showSuccess("Rasm muvaffaqiyatli yuklandi!"); // Removed toastId
        } else {
          showError("Rasmni yuklashda xatolik yuz berdi."); // Removed toastId
          const newImagePreviewUrls = [...imagePreviewUrls];
          newImagePreviewUrls[index] = "";
          setImagePreviewUrls(newImagePreviewUrls.filter(Boolean));
        }
      } catch (error) {
        console.error("Error handling image upload:", error);
        showError("Rasmni yuklashda kutilmagan xatolik yuz berdi."); // Removed toastId
        const newImagePreviewUrls = [...imagePreviewUrls];
        newImagePreviewUrls[index] = "";
        setImagePreviewUrls(newImagePreviewUrls.filter(Boolean));
      } finally {
        setIsUploading(false);
      }
    } else {
      const newImageFiles = [...imageFiles];
      newImageFiles[index] = undefined as any; // Clear file
      setImageFiles(newImageFiles.filter(Boolean) as File[]);
      const newImagePreviewUrls = [...imagePreviewUrls];
      newImagePreviewUrls[index] = "";
      setImagePreviewUrls(newImagePreviewUrls.filter(Boolean));
    }
  };

  useEffect(() => {
    setImageFiles([]);
    setImagePreviewUrls([]);
  }, [currentTab]);


  const handleAddQuestion = async (part: SpeakingPart) => {
    if (isUploading) {
      showError("Rasmlar yuklanmoqda. Iltimos kuting.");
      return;
    }

    let finalImageUrls: string[] = [];
    const isImageRequiredPart = ["Part 1.2", "Part 2", "Part 3"].includes(part);

    if (isImageRequiredPart) {
      if (imagePreviewUrls.filter(Boolean).length < 2) {
        showError("Kamida ikkita rasm yuklanmagan.");
        return;
      }
      finalImageUrls = imagePreviewUrls.filter(Boolean);
    }

    if (part === "Part 1") {
      if (!questionText.trim()) {
        showError("Savol matni bo'sh bo'lishi mumkin emas.");
        return;
      }
      const newQuestion: Part1Question = {
        id: uuidv4(),
        type: "part1",
        text: questionText.trim(),
        date: new Date().toISOString(),
      };
      setQuestions(prev => ({
        ...prev,
        [part]: [newQuestion, ...prev[part]],
      }));
      setQuestionText("");
      showSuccess(`Savol ${part} ga qo'shildi!`);
    } else if (part === "Part 1.1") {
      const subQ = subQuestionsText.split('\n').map(q => q.trim()).filter(q => q.length > 0);
      if (subQ.length === 0) {
        showError("Kamida bitta kichik savol kiritishingiz kerak.");
        return;
      }
      const newQuestion: Part1_1Question = {
        id: uuidv4(),
        type: "part1.1",
        subQuestions: subQ,
        date: new Date().toISOString(),
      };
      setQuestions(prev => ({
        ...prev,
        [part]: [newQuestion, ...prev[part]],
      }));
      setSubQuestionsText("");
      showSuccess(`Savol ${part} ga qo'shildi!`);
    } else if (part === "Part 1.2") {
      const subQ = subQuestionsText.split('\n').map(q => q.trim()).filter(q => q.length > 0);
      if (finalImageUrls.length < 2 || subQ.length === 0) {
        showError("Kamida ikkita rasm va bitta kichik savol kiritishingiz kerak.");
        return;
      }
      const newQuestion: Part1_2Question = {
        id: uuidv4(),
        type: "part1.2",
        imageUrls: finalImageUrls,
        subQuestions: subQ,
        date: new Date().toISOString(),
      };
      setQuestions(prev => ({
        ...prev,
        [part]: [newQuestion, ...prev[part]],
      }));
      setImageFiles([]);
      setImagePreviewUrls([]);
      setSubQuestionsText("");
      showSuccess(`Savol ${part} ga qo'shildi!`);
    }
    else if (part === "Part 2") {
      if (finalImageUrls.length < 2 || !questionText.trim()) {
        showError("Kamida ikkita rasm va savol matni bo'sh bo'lishi mumkin emas.");
        return;
      }
      const newQuestion: Part2Question = {
        id: uuidv4(),
        type: "part2",
        imageUrls: finalImageUrls,
        question: questionText.trim(),
        date: new Date().toISOString(),
      };
      setQuestions(prev => ({
        ...prev,
        [part]: [newQuestion, ...prev[part]],
      }));
      setImageFiles([]);
      setImagePreviewUrls([]);
      setQuestionText("");
      showSuccess(`Savol ${part} ga qo'shildi!`);
    } else if (part === "Part 3") {
      if (finalImageUrls.length < 2 || !questionText.trim()) {
        showError("Savol matni va kamida ikkita rasm bo'sh bo'lishi mumkin emas.");
        return;
      }
      const newQuestion: Part3Question = {
        id: uuidv4(),
        type: "part3",
        question: questionText.trim(),
        imageUrls: finalImageUrls,
        date: new Date().toISOString(),
      };
      setQuestions(prev => ({
        ...prev,
        [part]: [newQuestion, ...prev[part]],
      }));
      setQuestionText("");
      setImageFiles([]);
      setImagePreviewUrls([]);
      showSuccess(`Savol ${part} ga qo'shildi!`);
    }
  };

  const deleteImageFromSupabase = async (imageUrl: string) => {
    try {
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1]; // Get the file name from the URL
      const { error } = await supabase.storage
        .from('question-images')
        .remove([fileName]);

      if (error) {
        throw error;
      }
      console.log(`Image ${fileName} deleted from Supabase Storage.`);
    } catch (error: any) {
      console.error("Error deleting image from Supabase:", error.message);
      showError(`Rasmni o'chirishda xatolik yuz berdi: ${error.message}`);
    }
  };

  const handleDeleteQuestion = (part: SpeakingPart, id: string) => {
    setQuestions(prev => {
      const questionToDelete = prev[part].find(q => q.id === id);
      if (questionToDelete) {
        // If the question has images, attempt to delete them from Supabase Storage
        if (
          (questionToDelete.type === "part1.2" && (questionToDelete as Part1_2Question).imageUrls) ||
          (questionToDelete.type === "part2" && (questionToDelete as Part2Question).imageUrls) ||
          (questionToDelete.type === "part3" && (questionToDelete as Part3Question).imageUrls)
        ) {
          const imageUrls = (questionToDelete as Part1_2Question | Part2Question | Part3Question).imageUrls;
          imageUrls.forEach(url => deleteImageFromSupabase(url));
        }
      }

      const updatedQuestions = prev[part].filter(q => q.id !== id);
      showSuccess("Savol muvaffaqiyatli o'chirildi!");
      return {
        ...prev,
        [part]: updatedQuestions,
      };
    });
  };

  const renderQuestionInput = (part: SpeakingPart) => {
    const isImageRequiredPart = ["Part 1.2", "Part 2", "Part 3"].includes(part);
    return (
      <>
        {isImageRequiredPart && (
          <div className="space-y-4 mb-4">
            <Label className="text-base">Rasmlar yuklash (2 ta rasm talab qilinadi)</Label>
            {[0, 1].map((idx) => (
              <div key={idx} className="space-y-2 border p-2 rounded-md">
                <Label htmlFor={`image-upload-${part}-${idx}`} className="text-sm">Rasm {idx + 1} yuklash</Label>
                <Input
                  id={`image-upload-${part}-${idx}`}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, idx)}
                  className="mt-1"
                  disabled={isUploading}
                />
                {imagePreviewUrls[idx] && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-1">Oldindan ko'rish:</p>
                    <img src={imagePreviewUrls[idx]} alt={`Image Preview ${idx + 1}`} className="max-h-32 object-contain rounded-md border p-1" />
                  </div>
                )}
              </div>
            ))}
            <p className="text-xs text-red-500 mt-1">
              Eslatma: Rasmlar Supabase Storage'ga yuklanadi.
            </p>
          </div>
        )}

        {part === "Part 1" && (
          <>
            <Label htmlFor={`question-text-${part}`} className="text-base">Yangi savol qo'shish</Label>
            <Textarea
              id={`question-text-${part}`}
              placeholder={`Part 1 uchun savol kiriting...`}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </>
        )}

        {["Part 1.1", "Part 1.2"].includes(part) && (
          <>
            <Label htmlFor={`sub-questions-${part}`} className="text-base">Kichik savollar (har birini yangi qatordan kiriting)</Label>
            <Textarea
              id={`sub-questions-${part}`}
              placeholder="1-savol&#10;2-savol&#10;3-savol"
              value={subQuestionsText}
              onChange={(e) => setSubQuestionsText(e.target.value)}
              rows={5}
              className="mt-1"
            />
          </>
        )}

        {["Part 2", "Part 3"].includes(part) && (
          <>
            <Label htmlFor={`question-text-${part}`} className="text-base">Asosiy savol</Label>
            <Textarea
              id={`question-text-${part}`}
              placeholder={`${part} uchun savol kiriting...`}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </>
        )}
      </>
    );
  };

  const renderQuestionCardContent = (q: SpeakingQuestion) => {
    switch (q.type) {
      case "part1":
        return <p className="text-sm flex-grow mr-4">{q.text}</p>;
      case "part1.1":
        const part1_1Q = q as Part1_1Question;
        return (
          <div className="flex flex-col items-start flex-grow mr-4">
            <ul className="list-disc list-inside text-sm">
              {part1_1Q.subQuestions.map((subQ, i) => (
                <li key={i}>{subQ}</li>
              ))}
            </ul>
          </div>
        );
      case "part1.2":
        const part1_2Q = q as Part1_2Question;
        return (
          <div className="flex flex-col items-start flex-grow mr-4">
            <div className="flex gap-2 mb-2">
              {part1_2Q.imageUrls.map((url, idx) => (
                <img key={idx} src={url} alt={`Question image ${idx + 1}`} className="max-h-24 object-contain rounded-md" />
              ))}
            </div>
            <ul className="list-disc list-inside text-sm">
              {part1_2Q.subQuestions.map((subQ, i) => (
                <li key={i}>{subQ}</li>
              ))}
            </ul>
          </div>
        );
      case "part2":
        const part2Q = q as Part2Question;
        return (
          <div className="flex flex-col items-start flex-grow mr-4">
            <div className="flex gap-2 mb-2">
              {part2Q.imageUrls.map((url, idx) => (
                <img key={idx} src={url} alt={`Question image ${idx + 1}`} className="max-h-24 object-contain rounded-md" />
              ))}
            </div>
            <p className="text-sm">{part2Q.question}</p>
          </div>
        );
      case "part3":
        const part3Q = q as Part3Question;
        return (
          <div className="flex flex-col items-start flex-grow mr-4">
            <p className="text-sm mb-2">{part3Q.question}</p>
            <div className="flex gap-2">
              {part3Q.imageUrls.map((url, idx) => (
                <img key={idx} src={url} alt={`Question image ${idx + 1}`} className="max-h-24 object-contain rounded-md" />
              ))}
            </div>
          </div>
        );
      default:
        return <p className="text-sm flex-grow mr-4">Noma'lum savol turi</p>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="flex-grow container mx-auto p-4">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Speaking savollarini boshqarish</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={currentTab} onValueChange={(value) => {
              setCurrentTab(value as SpeakingPart);
              setQuestionText("");
              setImageFiles([]);
              setImagePreviewUrls([]);
              setSubQuestionsText("");
            }} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                {allSpeakingParts.map(part => (
                  <TabsTrigger key={part} value={part}>{part}</TabsTrigger>
                ))}
              </TabsList>

              {allSpeakingParts.map(part => (
                <TabsContent key={part} value={part} className="mt-4">
                  <h3 className="text-xl font-semibold mb-4">{part} savollari</h3>
                  <div className="space-y-4 mb-6 p-4 border rounded-lg bg-card">
                    {renderQuestionInput(part)}
                    <Button onClick={() => handleAddQuestion(part)} className="w-full" disabled={isUploading}>
                      Savolni {part} ga qo'shish
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {questions[part].length === 0 ? (
                      <p className="text-center text-muted-foreground">Part {part} uchun hali savollar qo'shilmagan.</p>
                    ) : (
                      questions[part].map((q) => (
                        <div key={q.id} className="flex items-center justify-between p-3 border rounded-md bg-secondary text-secondary-foreground">
                          {renderQuestionCardContent(q)}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{format(new Date(q.date), "MMM dd, yyyy HH:mm")}</span>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(part, q.id)} aria-label="Savolni o'chirish">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default SpeakingQuestionManager;