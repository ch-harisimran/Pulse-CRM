"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { DollarSign, Handshake, Percent, UserPlus } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueTrendChart } from "@/components/dashboard/revenue-trend-chart";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { WinLossChart } from "@/components/dashboard/win-loss-chart";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { GenerateReportButton } from "@/components/reports/generate-report-button";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/session-context";

type Stats = {
  kpis: Record<"totalRevenue" | "activeDeals" | "winRate" | "newCustomers", { value: number; deltaPct: number }>;
  sparklines: Record<"revenue" | "activeDeals" | "winRate" | "newCustomers", number[]>;
  revenueTrend: { month: string; revenue: number }[];
  pipeline: { stage: string; count: number; value: number }[];
  winLoss: { name: string; value: number }[];
};

export default function DashboardPage() {
  const { user } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user.name.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">Here's how your team is performing.</p>
        </div>
        <GenerateReportButton onGenerated={() => setRefreshKey((k) => k + 1)} />
      </motion.div>

      {!stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[168px] rounded-xl" />
          ))}
          <Skeleton className="h-[340px] rounded-xl sm:col-span-2 xl:col-span-3" />
          <Skeleton className="h-[340px] rounded-xl" />
        </div>
      )}

      {stats && (
        <DashboardGrid>
          {{
            "kpi-revenue": (
              <KpiCard
                label="Total revenue"
                value={stats.kpis.totalRevenue.value}
                format="currency"
                deltaPct={stats.kpis.totalRevenue.deltaPct}
                sparklineData={stats.sparklines.revenue}
                icon={DollarSign}
                accent="#10B981"
                delay={0}
              />
            ),
            "kpi-deals": (
              <KpiCard
                label="Active deals"
                value={stats.kpis.activeDeals.value}
                format="number"
                deltaPct={stats.kpis.activeDeals.deltaPct}
                sparklineData={stats.sparklines.activeDeals}
                icon={Handshake}
                accent="#0EA5E9"
                delay={0.05}
              />
            ),
            "kpi-winrate": (
              <KpiCard
                label="Win rate"
                value={stats.kpis.winRate.value}
                format="percent"
                deltaPct={stats.kpis.winRate.deltaPct}
                sparklineData={stats.sparklines.winRate}
                icon={Percent}
                accent="#8B5CF6"
                delay={0.1}
              />
            ),
            "kpi-customers": (
              <KpiCard
                label="New customers"
                value={stats.kpis.newCustomers.value}
                format="number"
                deltaPct={stats.kpis.newCustomers.deltaPct}
                sparklineData={stats.sparklines.newCustomers}
                icon={UserPlus}
                accent="#F59E0B"
                delay={0.15}
              />
            ),
            "chart-revenue": <RevenueTrendChart data={stats.revenueTrend} />,
            "chart-winloss": <WinLossChart data={stats.winLoss} />,
            "chart-pipeline": <PipelineChart data={stats.pipeline} />,
            activity: <ActivityFeed limit={8} />,
          }}
        </DashboardGrid>
      )}
    </div>
  );
}
