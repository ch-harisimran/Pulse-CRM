"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenerateReportModal } from "./generate-report-modal";

export function GenerateReportButton({
  label = "Generate Report",
  onGenerated,
  size = "default",
}: {
  label?: string;
  onGenerated?: () => void;
  size?: "default" | "sm" | "lg";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size={size} onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4" />
        {label}
      </Button>
      <GenerateReportModal open={open} onOpenChange={setOpen} onGenerated={onGenerated} />
    </>
  );
}
