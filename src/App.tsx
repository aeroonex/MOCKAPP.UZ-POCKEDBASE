import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
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
import { supabase } from "./lib/supabase"; // Supabase client'ni import qilish
import { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-xl text-muted-foreground">Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/mock-test" element={<MockTest />} /> {/* MockTest har doim ochiq */}
            
            {/* Himoyalangan marshrutlar guruhi */}
            <Route element={<ProtectedRoute session={session} allowedPaths={["/mock-test", "/records"]} />}>
              <Route path="/home" element={<Home />} />
              <Route path="/add-question" element={<AddQuestion />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/user-profile" element={<UserProfile />} />
              <Route path="/questions" element={<Questions />} />
              <Route path="/records" element={<Records />} />
              <Route path="/mood-journal" element={<MoodJournal />} /> {/* MoodJournal ham himoyalangan */}
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;