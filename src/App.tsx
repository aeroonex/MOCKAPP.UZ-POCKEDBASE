import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
// import Index from "./pages/Index"; // Index importini olib tashladim
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
import { AuthProvider } from "./context/AuthProvider";
// import NetworkStatusFooter from "./components/NetworkStatusFooter"; // NetworkStatusFooter importini olib tashladim

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-left" richColors />
        <BrowserRouter>
          <AuthProvider>
            <div className="pb-10 bg-background text-foreground min-h-screen">
              <Routes>
                <Route path="/" element={<Login />} /> {/* Asosiy marshrutni Login sahifasiga o'zgartirdim */}
                <Route path="/login" element={<Login />} />
                <Route path="/mock-test" element={<MockTest />} />
                
                {/* Himoyalangan marshrutlar guruhi */}
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
            {/* <NetworkStatusFooter /> */} {/* NetworkStatusFooter komponentini olib tashladim */}
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;