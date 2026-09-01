"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { ReportCard, type ReportListItem } from "@/components/reports/report-card";
import { GenerateReportButton } from "@/components/reports/generate-report-button";
import { MarkdownContent } from "@/components/reports/markdown-content";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportListItem[] | null>(null);
  const [active, setActive] = useState<ReportListItem | null>(null);

  const load = useCallback(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => setReports(d.reports));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">AI-generated executive summaries, saved for your team.</p>
        </div>
        <GenerateReportButton onGenerated={load} />
      </div>

      {reports === null && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-xl" />
          ))}
        </div>
      )}

      {reports !== null && reports.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center"
        >
          <FileText className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No reports yet. Generate your first executive summary above.</p>
        </motion.div>
      )}

      <div className="space-y-3">
        {reports?.map((r, i) => (
          <ReportCard key={r.id} report={r} index={i} onClick={() => setActive(r)} />
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <DialogContent className="max-w-2xl">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{active.title}</DialogTitle>
                <DialogDescription>
                  Generated {formatDistanceToNow(new Date(active.createdAt), { addSuffix: true })}
                  {active.author ? ` by ${active.author.name}` : ""}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
                <MarkdownContent content={active.content} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
