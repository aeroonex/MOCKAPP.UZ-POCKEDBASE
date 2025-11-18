"use client";

import React from "react";
import { Building, User, TrendingUp, LayoutGrid } from "lucide-react"; // LayoutGrid for Edumock.uz icon

const ProcessSteps: React.FC = () => {
  const steps = [
    {
      icon: <LayoutGrid className="h-8 w-8 process-card-icon mx-auto mb-2" />,
      text: "Edumock.uz",
      delay: "0s",
      active: true,
    },
    {
      icon: <Building className="h-8 w-8 process-card-icon mx-auto mb-2" />,
      text: "O'quv Markazi",
      delay: "0.3s",
      active: false,
    },
    {
      icon: <User className="h-8 w-8 process-card-icon mx-auto mb-2" />,
      text: "Student",
      delay: "0.6s",
      active: false,
    },
    {
      icon: <TrendingUp className="h-8 w-8 process-card-icon mx-auto mb-2" />,
      text: "Natija",
      delay: "0.9s",
      active: false,
    },
  ];

  return (
    <div id="process-steps" className="mb-10 mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-[800px]">
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <div
            className={`process-card p-4 rounded-xl text-center shadow-lg ${step.active ? 'border-primary border-2' : ''} animated-card`}
            style={{ animationDelay: step.delay }}
          >
            {step.icon}
            <p className="text-sm font-semibold text-gray-800">{step.text}</p>
          </div>
          {/* O'q va chiziq elementini olib tashladim */}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ProcessSteps;