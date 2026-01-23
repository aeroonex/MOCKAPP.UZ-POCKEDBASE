"use client";
import React from "react";
import { Building, User, TrendingUp, LayoutGrid } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";

const ProcessSteps: React.FC = () => {
  const { t } = useTranslation();

  const steps = [
    {
      icon: <LayoutGrid className="h-8 w-8 process-card-icon mx-auto mb-2" />,
      textKey: "landing_page.process_step_edumock",
      delay: "0s",
      status: "active"
    },
    {
      icon: <Building className="h-8 w-8 process-card-icon mx-auto mb-2" />,
      textKey: "landing_page.process_step_cdi_mock",
      delay: "0.3s",
      status: "upcoming"
    },
    {
      icon: <User className="h-8 w-8 process-card-icon mx-auto mb-2" />,
      textKey: "landing_page.process_step_cefr_mock_student",
      delay: "0.6s",
      status: "upcoming"
    },
    {
      icon: <TrendingUp className="h-8 w-8 process-card-icon mx-auto mb-2" />,
      textKey: "landing_page.process_step_result",
      delay: "0.9s",
      status: "upcoming"
    },
  ];

  return (
    <div id="process-steps" className="mb-10 mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 max-w-[800px]">
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <div
            className={cn(
              `process-card p-4 rounded-xl text-center shadow-lg animated-card relative`,
              step.status === 'active' ? 'border-primary border-2 btn-hover-glow' : 'border-border border-dashed cursor-default opacity-70',
            )}
            style={{ animationDelay: step.delay }}
          >
            {step.icon}
            <p className="text-sm font-semibold text-foreground">{t(step.textKey)}</p>
            {step.status === 'upcoming' && (
              <span className="coming-soon-badge">
                {t("common.coming_soon")}
              </span>
            )}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export default ProcessSteps;