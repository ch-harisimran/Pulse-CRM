"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Sparkline } from "./sparkline";
import { useCountUp } from "@/hooks/use-count-up";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  format = "number",
  deltaPct,
  sparklineData,
  icon: Icon,
  accent,
  delay = 0,
}: {
  label: string;
  value: number;
  format?: "number" | "currency" | "percent";
  deltaPct: number;
  sparklineData: number[];
  icon: LucideIcon;
  accent: string;
  delay?: number;
}) {
  const animated = useCountUp(value, { decimals: format === "percent" ? 1 : 0 });
  const isUp = deltaPct >= 0;

  const display =
    format === "currency" ? formatCurrency(animated) : format === "percent" ? `${animated}%` : formatNumber(animated);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      whileHover={{ y: -2 }}
    >
      <Card className="flex h-full flex-col overflow-hidden p-5 transition-shadow hover:shadow-card-hover">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">{display}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: accent + "18" }}>
            <Icon className="h-[18px] w-[18px]" style={{ color: accent }} />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <motion.span
            initial={{ opacity: 0.4 }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.8, repeat: 2, delay: delay + 0.6 }}
            className={cn(
              "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
              isUp ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
            )}
          >
            {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(deltaPct)}%
          </motion.span>
          <span className="text-xs text-muted-foreground">vs prior 30 days</span>
        </div>

        <div className="mt-2 -mx-1">
          <Sparkline data={sparklineData.length ? sparklineData : [0]} color={accent} />
        </div>
      </Card>
    </motion.div>
  );
}
