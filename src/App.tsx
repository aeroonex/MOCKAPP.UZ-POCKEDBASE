import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import MoodJournal from "./pages/MoodJournal";
import Login from "./pages/Login";
import Home from "./pages/Home";
import AddQuestion from "./pages/AddQuestion";
import MockTest from "./pages/MockTest";
import Settings from "./pages/Settings";
import UserProfile from "./pages/UserProfile";
import Questions from "./pages/Questions";
import Records from "./pages/Records";
import ProtectedRoute from "./components/ProtectedRoute";
import SuperAdminRoute from "./components/SuperAdminRoute";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import { AuthProvider } from "./context/AuthProvider";
import EduAiAssistant from "./components/EduAiAssistant"; // Import EduAiAssistant
import { useState } from "react"; // Import useState
import { Button } from "./components/ui/button"; // Import Button
import { Bot } from "lucide-react"; // Import Bot icon
import { useTranslation } from 'react-i18next'; // Import useTranslation

const queryClient = new QueryClient();

const App = () => {
  const [isEduAiAssistantOpen, setIsEduAiAssistantOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner 
          position="top-left" 
          richColors 
          theme="system" // Tizim mavzusiga moslashish uchun
          toastOptions={{
            success: {
              style: {
                backgroundColor: 'hsl(var(--success-color) / 0.1)',
                borderColor: 'hsl(var(--success-color))',
                color: 'hsl(var(--foreground))',
              },
              iconTheme: {
                primary: 'hsl(var(--success-color))',
                secondary: 'hsl(var(--primary-foreground))',
              },
            },
            error: {
              style: {
                backgroundColor: 'hsl(var(--error-color) / 0.1)',
                borderColor: 'hsl(var(--error-color))',
                color: 'hsl(var(--foreground))',
              },
              iconTheme: {
                primary: 'hsl(var(--error-color))',
                secondary: 'hsl(var(--primary-foreground))',
              },
            },
            info: {
              iconTheme: {
                primary: 'hsl(var(--info-color))',
                secondary: 'hsl(var(--primary-foreground))',
              },
            },
          }}
        />
        <BrowserRouter>
          <AuthProvider>
            <div className="pb-10 bg-background text-foreground min-h-screen">
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/mock-test" element={<MockTest />} />
                
                {/* Super Admin uchun himoyalangan marshrut */}
                <Route element={<SuperAdminRoute />}>
                  <Route path="/superadmin" element={<SuperAdminDashboard />} />
                </Route>

                {/* Oddiy foydalanuvchilar uchun himoyalangan marshrutlar guruhi */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/home" element={<Home />} />
                  <Route path="/add-question" element={<AddQuestion />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/user-profile" element={<UserProfile />} />
                  <Route path="/questions" element={<Questions />} />
                  <Route path="/records" element={<Records />} />
                  <Route path="/mood-journal" element={<MoodJournal />} />
                </Route>

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            
            {/* Floating EduAi Assistant Button */}
            <Button
              variant="default"
              size="icon"
              className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg bg-gradient-purple transition-all duration-300 animate-button-pulse btn-hover-glow"
              onClick={() => setIsEduAiAssistantOpen(true)}
              aria-label={t("eduai_assistant.open_assistant")}
            >
              <Bot className="h-7 w-7 text-primary-foreground" />
            </Button>

            <EduAiAssistant isOpen={isEduAiAssistantOpen} onClose={() => setIsEduAiAssistantOpen(false)} />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;