"use client";

import { geminiApiKey } from "@/lib/eduai";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Bot, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { playSound } from '@/utils/toast'; // playSound funksiyasini import qilish

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface EduAiAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";
const apiKey = geminiApiKey;

const systemInstruction = `
    You are "EduAi," the helpful and professional assistant for Edumock.uz. Your primary goal is to provide accurate, concise, and friendly information based on the platform's services, tariffs, and contact details provided below. Use a friendly, encouraging, and highly professional tone.

    Edumock.uz Platform Details:
    - Platform Name: Edumock.uz (Speaking Platform).

    - Mission: An educational platform in Uzbekistan that fully organizes the Speaking part of CEFR exams for training centers and guarantees students quality preparation.
    - Core Features: Unlimited attempts, Unlimited downloads, EduCloud Storage (size varies by tariff), Add/Edit custom questions, Support (24/7 to VIP), Faster Cloud Sync (12 Monthly+), Priority Cloud Backup (Lifetime+), Exclusive Features Unlock (Lifetime+).

    Tariff Plans (All prices are in so'm):
    - 1 MONTHLY: 499,000 so'm. Includes 2 GB EduCloud Storage, 24/7 Support.
    - 3 MONTHLY (HOT SALE): 1,199,000 so'm (20% off the original 1,497,000 so'm). Includes 10 GB EduCloud Storage, Priority Support.
    - 6 MONTHLY: 2,599,000 so'm (13% off the original 2,994,000 so'm). Includes 25 GB EduCloud Storage, Premium Support.
    - 12 MONTHLY: 4,999,000 so'm (16.5% off the original 5,988,000 so'm). Includes 50 GB EduCloud Storage, Premium Support, Faster Cloud Sync.
    - LIFETIME (BUSINESS): 6,599,000 so'm. Includes 100 GB EduCloud Storage (Lifetime), VIP Support, Priority Cloud Backup, Exclusive Features Unlock.

    Important Instructions (Guide):
    1. Browser Storage: Recorded videos are saved locally in the browser's storage and are only accessible from the browser used to record.
    2. Data Security: It is highly recommended to upload videos to EduCloud storage as soon as possible after the test to prevent loss from clearing browser data (history, cache, cookies).
    3. Screen Recording: When starting the test, the user MUST select 'Entire Screen' in the pop-up window, check the 'Also share system audio' box, and click 'Share'.

    Contact Information (for Purchase or Assistance):
    - Phone 1: +998 77 207 71 17
    - Phone 2: +998 50 571 65 15
    - Telegram (Personal Contact): @aero_one

    Always prioritize information from this knowledge base first. If you need to answer a general question not covered here (e.g., "What is CEFR?"), you may use Google Search grounding. If the user asks for contact information, provide ALL three contacts listed above clearly.
`;

const EduAiAssistant: React.FC<EduAiAssistantProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && chatHistory.length === 0) {
      const initialGreeting = t("eduai_assistant.initial_greeting");
      setChatHistory([{ role: "model", parts: [{ text: initialGreeting }] }]);
    }
  }, [isOpen, chatHistory.length, t]);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isTyping]);

  const fetchWithRetry = useCallback(async (payload: any, maxRetries = 5, delay = 1000): Promise<Response> => {
    if (!apiKey) {
      throw new Error("Gemini API Key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.");
    }
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(API_URL + `?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.status === 429 && i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
          continue;
        }
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;

      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
    throw new Error("Max retries exceeded for API call.");
  }, [apiKey]);

  const handleChatSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    const userQuery = userInput.trim();

    if (!userQuery) return; // Agar maydoncha bo'sh bo'lsa, xabar yuborilmaydi

    setChatHistory(prev => [...prev, { role: "user", parts: [{ text: userQuery }] }]);
    setUserInput('');
    setIsLoading(true);
    setIsTyping(true);
    playSound('success'); // Foydalanuvchi xabar yuborganda ovoz effektini ijro etish

    const currentPayload = {
      contents: [...chatHistory, { role: "user", parts: [{ text: userQuery }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      tools: [{ "google_search": {} }],
    };

    try {
      const response = await fetchWithRetry(currentPayload);
      const result = await response.json();

      const candidate = result.candidates?.[0];
      const aiText = candidate?.content?.parts?.[0]?.text;
      let sources: { uri: string; title: string }[] = [];

      if (aiText) {
        const groundingMetadata = candidate.groundingMetadata;
        if (groundingMetadata && groundingMetadata.groundingAttributions) {
          sources = groundingMetadata.groundingAttributions
            .map((attribution: any) => ({
              uri: attribution.web?.uri,
              title: attribution.web?.title,
            }))
            .filter((source: any) => source.uri && source.title);
        }

        setChatHistory(prev => [...prev, { role: "model", parts: [{ text: aiText }] }]);
      } else {
        setChatHistory(prev => [...prev, { role: "model", parts: [{ text: t("eduai_assistant.empty_response_error") }] }]);
      }

    } catch (error) {
      console.error("Gemini API Error:", error);
      setChatHistory(prev => [...prev, { role: "model", parts: [{ text: t("eduai_assistant.connection_error") }] }]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const renderMessageContent = (message: ChatMessage) => {
    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const escaped = escapeHtml(message.parts[0].text);
    const withBold = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    return <div dangerouslySetInnerHTML={{ __html: withBold.replace(/\n/g, '<br>') }} />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-lg h-[85vh] max-h-[720px] flex flex-col p-0 overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl">
        <DialogHeader className="px-4 py-3 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary ring-1 ring-primary/15">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base sm:text-lg font-bold leading-tight">
                {t("eduai_assistant.title")}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground truncate">
                {t("eduai_assistant.subtitle")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div
          id="eduai-messages"
          className="flex-grow overflow-y-auto space-y-3 px-4 py-4 bg-muted/30"
        >
          {chatHistory.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[88%] sm:max-w-[75%] px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                  message.role === "user"
                    ? "user-bubble"
                    : "ai-bubble"
                )}
              >
                {renderMessageContent(message)}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="ai-bubble max-w-[88%] sm:max-w-[75%] px-4 py-2.5 text-sm shadow-sm flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("eduai_assistant.typing")}</span>
                <div className="flex space-x-0.5">
                  <span className="typing-dot w-1.5 h-1.5 bg-muted-foreground rounded-full inline-block"></span>
                  <span className="typing-dot w-1.5 h-1.5 bg-muted-foreground rounded-full inline-block"></span>
                  <span className="typing-dot w-1.5 h-1.5 bg-muted-foreground rounded-full inline-block"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleChatSubmission} className="p-3 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
          <div className="flex items-end gap-2">
            <Input
              type="text"
              placeholder={t("eduai_assistant.input_placeholder")}
              className="h-11 rounded-full bg-background"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={isLoading}
              required
            />
            <Button
              type="submit"
              size="icon"
              className="h-11 w-11 rounded-full"
              disabled={isLoading}
              aria-label={t("eduai_assistant.send_button")}
            >
              {isLoading ? (
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EduAiAssistant;