"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import { CefrCentreFooter } from "@/components/CefrCentreFooter";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ImagePlus, ListChecks, Video } from "lucide-react";

const dashboardLinks = [
  { name: "Questions", path: "/questions", icon: BookOpen, description: "Barcha savollarni ko'rish" },
  { name: "Add Question", path: "/add-question", icon: ImagePlus, description: "Yangi savol qo'shish" },
  { name: "Mock Test", path: "/mock-test", icon: ListChecks, description: "Testni boshlash" },
  { name: "Records", path: "/records", icon: Video, description: "Yozib olingan videolarni ko'rish" },
];

const Home: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      <Navbar />
      <main className="flex-grow container mx-auto p-4 flex flex-col items-center justify-center text-center">
        {/* <div className="h-28 w-28 rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-900/20 animate-logo-pulse mb-6 shadow-lg border border-red-200">
          <span className="text-4xl font-extrabold text-red-600">CEFR LC</span>
        </div> */}
        <h1 className="text-5xl font-bold text-red-600 dark:text-red-500 mb-4">
          CEFR LC Speaking Platform
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Boshqaruv paneliga xush kelibsiz. Kerakli bo'limni tanlang.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl">
          {dashboardLinks.map((link) => (
            <Link to={link.path} key={link.name} className="transform hover:scale-105 transition-transform duration-200">
              <Card className="h-full flex flex-col items-center justify-center text-center p-6 hover:bg-red-50 border-red-100 hover:border-red-200">
                <CardHeader>
                  <link.icon className="h-12 w-12 mx-auto text-red-600 mb-4" />
                  <CardTitle>{link.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{link.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
      <CefrCentreFooter />
    </div>
  );
};

export default Home;