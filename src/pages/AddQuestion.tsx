"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";

const AddQuestion: React.FC = () => {
  const [questionText, setQuestionText] = useState<string>("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<string>("");

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!questionText.trim()) {
      showError("Question text cannot be empty.");
      return;
    }

    const filledOptions = options.filter(option => option.trim() !== "");
    if (filledOptions.length < 2) {
      showError("Please provide at least two options.");
      return;
    }

    if (correctAnswerIndex === "" || !options[parseInt(correctAnswerIndex)].trim()) {
      showError("Please select a valid correct answer.");
      return;
    }

    const newQuestion = {
      questionText: questionText.trim(),
      options: options.map(option => option.trim()),
      correctAnswer: options[parseInt(correctAnswerIndex)].trim(),
      correctAnswerIndex: parseInt(correctAnswerIndex),
    };

    console.log("New Question Added:", newQuestion);
    showSuccess("Question added successfully! (Frontend simulation)");

    // Reset form
    setQuestionText("");
    setOptions(["", "", "", ""]);
    setCorrectAnswerIndex("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="flex-grow container mx-auto p-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Add New Question</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="questionText" className="text-base">Question Text</Label>
                <Textarea
                  id="questionText"
                  placeholder="Enter your question here..."
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  rows={4}
                  className="mt-1"
                  required
                />
              </div>

              <div className="space-y-4">
                <Label className="text-base">Options</Label>
                {options.map((option, index) => (
                  <div key={index}>
                    <Label htmlFor={`option-${index}`} className="sr-only">Option {index + 1}</Label>
                    <Input
                      id={`option-${index}`}
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      className="mt-1"
                      required={index < 2} // Require at least two options
                    />
                  </div>
                ))}
              </div>

              <div>
                <Label htmlFor="correctAnswer" className="text-base">Correct Answer</Label>
                <Select value={correctAnswerIndex} onValueChange={setCorrectAnswerIndex}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Select the correct option" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option, index) => (
                      option.trim() !== "" && (
                        <SelectItem key={index} value={String(index)}>
                          {`Option ${index + 1}: ${option}`}
                        </SelectItem>
                      )
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full">
                Add Question
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default AddQuestion;