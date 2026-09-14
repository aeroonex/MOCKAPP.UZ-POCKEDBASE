"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";

/** Matnni buferga nusxalovchi kichik tugma (2 soniya "✓" ko'rsatadi). */
const CopyButton: React.FC<{ text: string; label: string; copiedLabel: string; className?: string; variant?: "secondary" | "outline" | "ghost" }> = ({
  text,
  label,
  copiedLabel,
  className,
  variant = "secondary",
}) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showSuccess(copiedLabel);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showError("Clipboard");
    }
  };
  return (
    <Button size="sm" variant={variant} className={cn("gap-1", className)} onClick={copy} disabled={!text}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {label}
    </Button>
  );
};

export default CopyButton;
