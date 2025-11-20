"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface PriceOption {
  price: number;
  display: string;
  originalPrice?: number;
  discount?: string;
  features: string[];
}

const prices: { [key: string]: PriceOption } = {
  "1": { 
    price: 299000, 
    display: "299,000 so'm",
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
    price: 749000, 
    display: "749,000 so'm", 
    originalPrice: 900000, 
    discount: "-16.7%",
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
    price: 1299000, 
    display: "1,299,000 so'm", 
    originalPrice: 1800000, 
    discount: "-27.8%",
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
    price: 2499000, 
    display: "2,499,000 so'm", 
    originalPrice: 3600000, 
    discount: "-30.6%",
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
    price: 5999000, 
    display: "5,999,000 so'm",
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

const PricingCard: React.FC = () => {
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
    <div className="bg-card p-6 border border-border rounded-xl shadow-2xl sticky top-20 animated-card" style={{ animationDelay: '1.5s' }}>
      <h2 className="text-xl font-bold text-foreground mb-6">{t("landing_page.select_tariff")}</h2>

      <Accordion 
        type="single" 
        collapsible 
        value={openAccordionValue} 
        onValueChange={setOpenAccordionValue}
      >
        {Object.keys(prices).map((key) => {
          const option = key;
          const priceData = prices[option];
          const isHotSaleCard = option === "3"; // Hot Sale kartasini aniqlash
          const isBusinessCard = option === "lifetime"; // Business kartasini aniqlash

          return (
            <AccordionItem 
              key={option} 
              value={option} 
              className={`price-option p-4 flex flex-col border border-border rounded-xl relative mb-3 last:mb-0 ${cardBackgrounds[option]} ${selectedPriceKey === option ? 'price-option-active' : ''}`}
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
              <AccordionTrigger className="flex justify-between items-center mb-2 p-0 hover:no-underline">
                <div className="flex-grow text-left">
                  <p className="font-semibold text-foreground">
                    {option === "lifetime" ? t("landing_page.lifetime") : `${option} ${t("landing_page.monthly")}`}
                  </p>
                  {priceData.originalPrice && (
                    <span className="text-xs text-red-500 line-through">{priceData.originalPrice.toLocaleString('uz-UZ')} so'm</span>
                  )}
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className={`text-xl font-bold ${selectedPriceKey === option ? 'text-primary' : 'text-foreground'}`}>
                    {priceData.display}
                  </p>
                  {priceData.discount && (
                    <span className="text-xs font-semibold bg-primary text-white rounded-full px-2 mt-1">{priceData.discount}</span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {priceData.features.map((featureKey) => (
                    <li key={featureKey} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      {t(`landing_page.features.${featureKey}`)}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="mb-6 p-3 border border-border rounded-xl flex justify-between items-center bg-input">
        <Input type="text" placeholder={t("landing_page.enter_promo_code")} className="w-full outline-none text-sm bg-transparent border-none focus-visible:ring-0" />
        <Button variant="ghost" className="text-primary font-semibold text-sm hover:text-primary/90 p-0 h-auto">{t("landing_page.promo_code")}</Button>
      </div>

      <Button asChild className="w-full mt-4 py-4 bg-primary text-white font-bold text-lg rounded-xl hover:bg-primary/90 transition duration-150 shadow-md">
        <a href="https://t.me/aero_one" target="_blank" rel="noopener noreferrer">
          {t("landing_page.pay_for")} {totalPrice.display}
        </a>
      </Button>
    </div>
  );
};

export default PricingCard;