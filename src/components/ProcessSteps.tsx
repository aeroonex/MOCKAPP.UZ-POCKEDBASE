"use client";
import React from "react";
import { Building, User, TrendingUp, LayoutGrid } from "lucide-react";
import { useTranslation } from 'react-i18next';

const ProcessSteps: React.FC = () => {
  const { t } = useTranslation();
  
  const steps = [
    { 
      icon: <LayoutGrid className="h-8 w-8 process-card-icon mx-auto mb-2" />, 
      textKey: "landing_page.process_step_edumock", 
      delay: "0s", 
      active: true 
    },
    { 
      icon: <Building className="h-8 w-8 process-card-icon mx-auto mb-2" />, 
      textKey: "landing_page.process_step_center", 
      delay: "0.3s", 
      active: false 
    },
    { 
      icon: <User className="h-8 w-8 process-card-icon mx-auto mb-2" />, 
      textKey: "landing_page.process_step_student", 
      delay: "0.6s", 
      active: false 
    },
    { 
      icon: <TrendingUp className="h-8 w-8 process-card-icon mx-auto mb-2" />, 
      textKey: "landing_page.process_step_result", 
      delay: "0.9s", 
      active: false 
    },
  ];

  return (
    <div id="process-steps" className="mb-10 mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 max-w-[800px]">
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <div 
            className={`process-card p-4 rounded-xl text-center shadow-lg ${step.active ? 'border-primary border-2' : ''} animated-card btn-hover-glow`}
            style={{ animationDelay: step.delay }}
          >
            {step.icon}
            <p className="text-sm font-semibold text-foreground">{t(step.textKey)}</p>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export default ProcessSteps;