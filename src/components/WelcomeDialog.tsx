"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useTranslation } from 'react-i18next';
import { motion } from "framer-motion";
import { CheckCircle, Lightbulb, Rocket, Cloud, BookOpen } from "lucide-react";

interface WelcomeDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const WelcomeDialog: React.FC<WelcomeDialogProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      icon: <Rocket className="h-12 w-12 text-primary mb-4" />,
      title: t("welcome_dialog.slide1_title"),
      description: t("welcome_dialog.slide1_description"),
      image: "https://public.aero.one/public/welcome-slide-1.png", // Placeholder image
    },
    {
      icon: <BookOpen className="h-12 w-12 text-primary mb-4" />,
      title: t("welcome_dialog.slide2_title"),
      description: t("welcome_dialog.slide2_description"),
      image: "https://public.aero.one/public/welcome-slide-2.png", // Placeholder image
    },
    {
      icon: <Cloud className="h-12 w-12 text-primary mb-4" />,
      title: t("welcome_dialog.slide3_title"),
      description: t("welcome_dialog.slide3_description"),
      image: "https://public.aero.one/public/welcome-slide-3.png", // Placeholder image
    },
    {
      icon: <Lightbulb className="h-12 w-12 text-primary mb-4" />,
      title: t("welcome_dialog.slide4_title"),
      description: t("welcome_dialog.slide4_description"),
      image: "https://public.aero.one/public/welcome-slide-4.png", // Placeholder image
    },
  ];

  const handleGetStarted = () => {
    localStorage.setItem('welcomeDialogShown', 'true');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl shadow-2xl">
        <Carousel
          className="w-full"
          opts={{
            align: "start",
            loop: false,
          }}
          onSelect={(api) => setCurrentSlide(api.selectedScrollSnap())}
        >
          <CarouselContent>
            {slides.map((slide, index) => (
              <CarouselItem key={index} className="p-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="flex flex-col items-center text-center"
                >
                  <img src={slide.image} alt={slide.title} className="w-full h-48 object-cover rounded-lg mb-6 shadow-md" />
                  {slide.icon}
                  <DialogTitle className="text-3xl font-bold text-primary mb-3">{slide.title}</DialogTitle>
                  <DialogDescription className="text-base text-muted-foreground mb-6">
                    {slide.description}
                  </DialogDescription>
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-10" />
          <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-10" />
        </Carousel>

        <div className="flex justify-between items-center p-6 border-t border-border bg-card">
          <div className="flex space-x-2">
            {slides.map((_, index) => (
              <span
                key={index}
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  index === currentSlide ? "bg-primary w-6" : "bg-muted-foreground"
                }`}
              />
            ))}
          </div>
          <Button onClick={handleGetStarted} className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-full shadow-lg">
            {t("welcome_dialog.get_started")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeDialog;