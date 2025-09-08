"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import { CefrCentreFooter } from "@/components/CefrCentreFooter";

const Home: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="flex-grow container mx-auto p-4 flex flex-col items-center justify-center text-center">
        <div className="h-28 w-28 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800 animate-logo-pulse mb-6 shadow-lg">
          <span className="text-4xl font-extrabold text-red-600">CEFR LC</span>
        </div>
        <h1 className="text-5xl font-bold text-primary dark:text-primary-foreground mb-4">
          CEFR LC Speaking Platform
        </h1>
        <p className="text-xl text-muted-foreground">
          Boshqaruv paneliga xush kelibsiz. Kerakli bo'limni tanlang.
        </p>
      </main>
      <CefrCentreFooter />
    </div>
  );
};

export default Home;