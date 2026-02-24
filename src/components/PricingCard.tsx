"use client";
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface PriceOption {
  price: number;
  display: string;
  originalPrice?: number;
  discount?: string;
  features: string[];
}

const prices: { [key: string]: PriceOption } = {
  "1": {
    price: 499000,
    display: "499,000 so'm",
    features: [
      "unlimited_attempts",
      "unlimited_downloads",
      "cloud_storage_2gb",
      "add_custom_questions",
      "edit_questions",
      "support_service_24_7"
    ]
  },
  "3": {
    price: 1199000,
    display: "1,199,000 so'm",
    originalPrice: 1497000, // 3 * 499,000
    discount: "-20%",
    features: [
      "unlimited_attempts",
      "unlimited_downloads",
      "cloud_storage_10gb",
      "add_custom_questions",
      "edit_questions",
      "priority_support"
    ]
  },
  "6": {
    price: 2599000,
    display: "2,599,000 so'm",
    originalPrice: 2994000, // 6 * 499,000
    discount: "-13%",
    features: [
      "unlimited_attempts",
      "unlimited_downloads",
      "cloud_storage_25gb",
      "add_custom_questions",
      "edit_questions",
      "premium_support"
    ]
  },
  "12": {
    price: 4999000,
    display: "4,999,000 so'm",
    originalPrice: 5988000, // 12 * 499,000
    discount: "-16.5%",
    features: [
      "unlimited_attempts",
      "unlimited_downloads",
      "cloud_storage_50gb",
      "add_custom_questions",
      "edit_questions",
      "premium_support",
      "faster_cloud_sync"
    ]
  },
  "lifetime": {
    price: 6599000,
    display: "6,599,000 so'm",
    features: [
      "unlimited_attempts",
      "unlimited_downloads",
      "cloud_storage_100gb_lifetime",
      "add_custom_questions",
      "edit_questions",
      "vip_support",
      "priority_cloud_backup",
      "exclusive_features_unlock"
    ]
  },
};

interface PricingCardProps {
  isDialog?: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({ isDialog = false }) => {
  const [openAccordionValue, setOpenAccordionValue] = useState<string | undefined>("1");
  const [selectedPriceKey, setSelectedPriceKey] = useState<string>("1");
  const { t } = useTranslation();

  useEffect(() => {
    if (openAccordionValue) {
      setSelectedPriceKey(openAccordionValue);
    }
  }, [openAccordionValue]);

  const totalPrice = prices[selectedPriceKey];
  // Har bir karta uchun fon klasslarini belgilash
  const cardBackgrounds: { [key: string]: string } = {
    "1": "bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900",
    "3": "bg-gradient-to-br from-red-50 to-white dark:from-red-950 dark:to-gray-900", // Hot Sale kartasi uchun
    "6": "bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900",
    "12": "bg-gradient-to-br from-purple-50 to-white dark:from-purple-950 dark:to-gray-900",
    "lifetime": "bg-gradient-to-br from-green-50 to-white dark:from-green-950 dark:to-gray-900",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-background/70 shadow-2xl backdrop-blur-md ring-1 ring-primary/10",
        "before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_at_top,theme(colors.primary.DEFAULT/0.18),transparent_60%)] before:opacity-70 before:pointer-events-none",
        "after:absolute after:inset-0 after:bg-gradient-to-br after:from-indigo-500/10 after:via-transparent after:to-emerald-400/10 after:pointer-events-none",
        isDialog ? "p-3" : "p-6 lg:sticky lg:top-20"
      )}
      style={{ animationDelay: '1.5s' }}
    >
      <h2 className={cn(
        "font-bold text-foreground",
        isDialog ? "text-base mb-2" : "text-xl mb-6"
      )}>{t("landing_page.select_tariff")}</h2>
      <Accordion type="single" collapsible value={openAccordionValue} onValueChange={setOpenAccordionValue}>
        {Object.keys(prices).map((key) => {
          const option = key;
          const priceData = prices[option];
          const isHotSaleCard = option === "3"; // Hot Sale kartasini aniqlash
          const isBusinessCard = option === "lifetime"; // Business kartasini aniqlash

          return (
            <AccordionItem
              key={option}
              value={option}
              className={cn(
                "price-option flex flex-col border border-border rounded-xl relative mb-2 last:mb-0",
                cardBackgrounds[option],
                selectedPriceKey === option ? 'price-option-active' : '',
                isDialog ? "p-2" : "p-4"
              )}
            >
              {isHotSaleCard && (
                <div className="hot-sale-badge absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10 animate-pulse-hot-sale">
                  {t("landing_page.hot_sale")}
                </div>
              )}
              {isBusinessCard && (
                <div className="business-badge absolute -top-3 -right-3 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10 animate-pulse-hot-sale">
                  {t("landing_page.business")}
                </div>
              )}
              <AccordionTrigger className="flex justify-between items-center p-0 hover:no-underline">
                <div className="flex-grow text-left">
                  <p className={cn("font-semibold text-foreground", isDialog ? "text-sm" : "text-base")}>
                    {option === "lifetime" ? t("landing_page.lifetime") : `${option} ${t("landing_page.monthly")}`}
                  </p>
                  {priceData.originalPrice && (
                    <span className="text-xs text-red-500 line-through">{priceData.originalPrice.toLocaleString('uz-UZ')} so'm</span>
                  )}
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className={cn(
                    "font-bold",
                    selectedPriceKey === option ? 'text-primary' : 'text-foreground',
                    isDialog ? "text-base" : "text-xl"
                  )}>
                    {priceData.display}
                  </p>
                  {priceData.discount && (
                    <span className="text-xs font-semibold bg-primary text-white rounded-full px-2 mt-1">{priceData.discount}</span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ul className={cn(
                  "space-y-1 text-muted-foreground",
                  isDialog ? "text-xs" : "mt-2 text-sm"
                )}>
                  {priceData.features.map((featureKey) => (
                    <li key={featureKey} className="flex items-center gap-2">
                      <CheckCircle className={cn(
                        "text-primary",
                        isDialog ? "h-3 w-3" : "h-4 w-4"
                      )} />
                      {t(`landing_page.features.${featureKey}`)}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      <Button asChild className={cn(
        "w-full mt-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition duration-150 shadow-md",
        isDialog ? "py-1.5 text-sm" : "py-4 text-lg"
      )}>
        <a href="https://t.me/aero_one" target="_blank" rel="noopener noreferrer">
          {t("landing_page.pay_for")} {totalPrice.display}
        </a>
      </Button>
    </div>
  );
};

export default PricingCard;