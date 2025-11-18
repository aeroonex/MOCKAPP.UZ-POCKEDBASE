"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';

interface PriceOption {
  price: number;
  display: string;
  originalPrice?: number;
  discount?: string;
}

const prices: { [key: string]: PriceOption } = {
  "1": { price: 299000, display: "299,000 so'm" },
  "3": { price: 749000, display: "749,000 so'm", originalPrice: 900000, discount: "-16.7%" },
  "6": { price: 1299000, display: "1,299,000 so'm", originalPrice: 1800000, discount: "-27.8%" },
  "12": { price: 2499000, display: "2,499,000 so'm", originalPrice: 3600000, discount: "-30.6%" },
  "lifetime": { price: 5999000, display: "5,999,000 so'm" },
};

const PricingCard: React.FC = () => {
  const [currentOption, setCurrentOption] = useState<string>("1");
  const [totalPrice, setTotalPrice] = useState<PriceOption>(prices["1"]);
  const { t } = useTranslation();

  useEffect(() => {
    setTotalPrice(prices[currentOption]);
  }, [currentOption]);

  const selectPrice = (option: string) => {
    setCurrentOption(option);
  };

  return (
    <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-2xl sticky top-20 animated-card" style={{ animationDelay: '1.5s' }}>
      <h2 className="text-xl font-bold text-gray-800 mb-6">{t("landing_page.select_tariff")}</h2>

      <div id="pricing-options" className="space-y-3 mb-6">
        {Object.keys(prices).map((key) => {
          const option = key;
          const priceData = prices[option];
          return (
            <div
              key={option}
              id={`price-${option}`}
              onClick={() => selectPrice(option)}
              className={`price-option p-4 flex justify-between items-center ${currentOption === option ? 'price-option-active' : ''}`}
            >
              <div>
                <p className="font-semibold text-gray-800">
                  {option === "lifetime" ? t("landing_page.lifetime") : `${option} ${t("landing_page.monthly")}`}
                </p>
                {priceData.originalPrice && (
                  <span className="text-xs text-red-500 line-through">{priceData.originalPrice.toLocaleString('uz-UZ')} so'm</span>
                )}
              </div>
              <div className="text-right flex flex-col items-end">
                <p className={`text-xl font-bold ${currentOption === option ? 'text-lime-600' : 'text-gray-800'}`}>
                  {priceData.display}
                </p>
                {priceData.discount && (
                  <span className="text-xs font-semibold bg-lime-500 text-white rounded-full px-2 mt-1">{priceData.discount}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-6 p-3 border border-gray-300 rounded-xl flex justify-between items-center bg-white">
        <Input type="text" placeholder={t("landing_page.enter_promo_code")} className="w-full outline-none text-sm bg-transparent border-none focus-visible:ring-0" />
        <Button variant="ghost" className="text-lime-500 font-semibold text-sm hover:text-lime-600 p-0 h-auto">{t("landing_page.promo_code")}</Button>
      </div>

      <div className="flex justify-between items-center border-t pt-4">
        <p className="text-lg font-bold text-gray-800">{t("landing_page.total")}</p>
        <p id="total-price" className="text-2xl font-extrabold text-lime-600">{totalPrice.display}</p>
      </div>

      <Button asChild className="w-full mt-4 py-4 bg-lime-500 text-white font-bold text-lg rounded-xl hover:bg-lime-600 transition duration-150 shadow-md">
        <a href="https://t.me/aero_one" target="_blank" rel="noopener noreferrer">
          {t("landing_page.pay_for")} {totalPrice.display}
        </a>
      </Button>
    </div>
  );
};

export default PricingCard;