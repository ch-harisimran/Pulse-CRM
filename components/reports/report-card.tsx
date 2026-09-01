"use client";

import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

export type ReportListItem = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author: { name: string; avatarColor: string } | null;
};

export function ReportCard({ report, onClick, index }: { report: ReportListItem; onClick: () => void; index: number }) {
  const preview = report.content.replace(/[#*_>-]/g, "").trim().slice(0, 160);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <Card className="cursor-pointer transition-shadow hover:shadow-card-hover" onClick={onClick}>
        <CardContent className="flex items-start gap-4 p-5">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/15 to-sky-500/15">
            <FileText className="h-[18px] w-[18px] text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-sm font-semibold">{report.title}</h3>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{preview}…</p>
            {report.author && (
              <div className="mt-3 flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarFallback
                    className="text-[9px]"
                    style={{ backgroundColor: report.author.avatarColor + "22", color: report.author.avatarColor }}
                  >
                    {initials(report.author.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">{report.author.name}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
