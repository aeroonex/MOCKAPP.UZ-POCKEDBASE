import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom"; // Removed Routes and useLocation from here
import { AuthProvider } from "./context/AuthProvider";
import { useTranslation } from 'react-i18next'; // Still needed for Sonner toastOptions

// Import the new AppContent component
import AppContent from "./components/AppContent";

const queryClient = new QueryClient();

const App = () => {
  const { t } = useTranslation(); // Still needed for Sonner toastOptions

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner
          position="top-left"
          richColors
          theme="system"
          toastOptions={{
            classNames: {
              toast:
                "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg data-[type=success]:border-[hsl(var(--success-color))] data-[type=success]:bg-[hsl(var(--success-color)/0.1)] data-[type=error]:border-[hsl(var(--error-color))] data-[type=error]:bg-[hsl(var(--error-color)/0.1)] data-[type=info]:border-[hsl(var(--info-color))] data-[type=info]:bg-[hsl(var(--info-color)/0.1)]",
              description: "group-[.toast]:text-muted-foreground",
              actionButton:
                "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
              cancelButton:
                "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
            },
          }}
        />
        <BrowserRouter>
          <AuthProvider>
            <AppContent /> {/* Render the new AppContent component here */}
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;