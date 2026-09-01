import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short" });
}

function weekBucketStart(d: Date) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  return date.getTime();
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.tenantId;

  const [allDeals, allCustomers] = await Promise.all([
    prisma.deal.findMany({ where: { tenantId }, select: { id: true, value: true, stage: true, closeDate: true, createdAt: true } }),
    prisma.customer.findMany({ where: { tenantId }, select: { id: true, createdAt: true, status: true } }),
  ]);

  const now = new Date();
  const periodStart = daysAgo(30);
  const prevPeriodStart = daysAgo(60);

  const wonInPeriod = allDeals.filter((d) => d.stage === "won" && d.closeDate >= periodStart && d.closeDate <= now);
  const wonInPrevPeriod = allDeals.filter((d) => d.stage === "won" && d.closeDate >= prevPeriodStart && d.closeDate < periodStart);
  const lostInPeriod = allDeals.filter((d) => d.stage === "lost" && d.closeDate >= periodStart && d.closeDate <= now);
  const lostInPrevPeriod = allDeals.filter((d) => d.stage === "lost" && d.closeDate >= prevPeriodStart && d.closeDate < periodStart);

  const totalRevenue = wonInPeriod.reduce((s, d) => s + d.value, 0);
  const prevRevenue = wonInPrevPeriod.reduce((s, d) => s + d.value, 0);

  const activeDeals = allDeals.filter((d) => d.stage === "open").length;
  const activeDealsCreatedInPeriod = allDeals.filter((d) => d.stage === "open" && d.createdAt >= periodStart).length;
  const activeDealsCreatedInPrevPeriod = allDeals.filter(
    (d) => d.stage === "open" && d.createdAt >= prevPeriodStart && d.createdAt < periodStart
  ).length;

  const winRate = wonInPeriod.length + lostInPeriod.length > 0 ? (wonInPeriod.length / (wonInPeriod.length + lostInPeriod.length)) * 100 : 0;
  const prevWinRate =
    wonInPrevPeriod.length + lostInPrevPeriod.length > 0
      ? (wonInPrevPeriod.length / (wonInPrevPeriod.length + lostInPrevPeriod.length)) * 100
      : 0;

  const newCustomers = allCustomers.filter((c) => c.createdAt >= periodStart).length;
  const prevNewCustomers = allCustomers.filter((c) => c.createdAt >= prevPeriodStart && c.createdAt < periodStart).length;

  // Revenue trend: last 6 months of won revenue
  const monthBuckets: { key: string; label: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthBuckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthLabel(d), revenue: 0 });
  }
  for (const d of allDeals) {
    if (d.stage !== "won") continue;
    const key = `${d.closeDate.getFullYear()}-${d.closeDate.getMonth()}`;
    const bucket = monthBuckets.find((b) => b.key === key);
    if (bucket) bucket.revenue += d.value;
  }

  // Pipeline by stage
  const pipeline = ["open", "won", "lost"].map((stage) => {
    const items = allDeals.filter((d) => d.stage === stage);
    return {
      stage: stage[0].toUpperCase() + stage.slice(1),
      count: items.length,
      value: items.reduce((s, d) => s + d.value, 0),
    };
  });

  // Win / loss donut (all-time, for a stable, meaningful ratio)
  const wonAll = allDeals.filter((d) => d.stage === "won").length;
  const lostAll = allDeals.filter((d) => d.stage === "lost").length;
  const winLoss = [
    { name: "Won", value: wonAll },
    { name: "Lost", value: lostAll },
  ];

  // Sparklines: weekly buckets, last 8 weeks
  function buildWeeklySparkline(filterFn: (d: (typeof allDeals)[number]) => boolean, valueFn: (d: (typeof allDeals)[number]) => number) {
    const weeks: number[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = weekBucketStart(daysAgo(i * 7));
      weeks.push(start);
    }
    return weeks.map((weekStart, idx) => {
      const weekEnd = idx < weeks.length - 1 ? weeks[idx + 1] : Date.now();
      const items = allDeals.filter((d) => filterFn(d) && d.closeDate.getTime() >= weekStart && d.closeDate.getTime() < weekEnd);
      return items.reduce((s, d) => s + valueFn(d), 0);
    });
  }

  const revenueSparkline = buildWeeklySparkline((d) => d.stage === "won", (d) => d.value);
  const dealsSparkline: number[] = [];
  {
    const weeks: number[] = [];
    for (let i = 7; i >= 0; i--) weeks.push(weekBucketStart(daysAgo(i * 7)));
    for (let idx = 0; idx < weeks.length; idx++) {
      const weekStart = weeks[idx];
      const weekEnd = idx < weeks.length - 1 ? weeks[idx + 1] : Date.now();
      dealsSparkline.push(allDeals.filter((d) => d.createdAt.getTime() >= weekStart && d.createdAt.getTime() < weekEnd).length);
    }
  }
  const winRateSparkline: number[] = [];
  {
    const weeks: number[] = [];
    for (let i = 7; i >= 0; i--) weeks.push(weekBucketStart(daysAgo(i * 7)));
    for (let idx = 0; idx < weeks.length; idx++) {
      const weekStart = weeks[idx];
      const weekEnd = idx < weeks.length - 1 ? weeks[idx + 1] : Date.now();
      const won = allDeals.filter((d) => d.stage === "won" && d.closeDate.getTime() >= weekStart && d.closeDate.getTime() < weekEnd).length;
      const lost = allDeals.filter((d) => d.stage === "lost" && d.closeDate.getTime() >= weekStart && d.closeDate.getTime() < weekEnd).length;
      winRateSparkline.push(won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0);
    }
  }
  const customersSparkline: number[] = [];
  {
    const weeks: number[] = [];
    for (let i = 7; i >= 0; i--) weeks.push(weekBucketStart(daysAgo(i * 7)));
    for (let idx = 0; idx < weeks.length; idx++) {
      const weekStart = weeks[idx];
      const weekEnd = idx < weeks.length - 1 ? weeks[idx + 1] : Date.now();
      customersSparkline.push(allCustomers.filter((c) => c.createdAt.getTime() >= weekStart && c.createdAt.getTime() < weekEnd).length);
    }
  }

  return NextResponse.json({
    kpis: {
      totalRevenue: { value: totalRevenue, deltaPct: pctChange(totalRevenue, prevRevenue) },
      activeDeals: { value: activeDeals, deltaPct: pctChange(activeDealsCreatedInPeriod, activeDealsCreatedInPrevPeriod) },
      winRate: { value: Math.round(winRate * 10) / 10, deltaPct: pctChange(winRate, prevWinRate) },
      newCustomers: { value: newCustomers, deltaPct: pctChange(newCustomers, prevNewCustomers) },
    },
    sparklines: {
      revenue: revenueSparkline,
      activeDeals: dealsSparkline,
      winRate: winRateSparkline,
      newCustomers: customersSparkline,
    },
    revenueTrend: monthBuckets.map((b) => ({ month: b.label, revenue: b.revenue })),
    pipeline,
    winLoss,
  });
}
