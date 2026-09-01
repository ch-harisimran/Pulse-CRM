import { prisma } from "@/lib/db";

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export async function gatherPeriodSummary(tenantId: string, periodDays = 30) {
  const now = new Date();
  const periodStart = daysAgo(periodDays);
  const prevPeriodStart = daysAgo(periodDays * 2);

  const [deals, customers, tenant] = await Promise.all([
    prisma.deal.findMany({
      where: { tenantId },
      include: { customer: { select: { name: true, company: true } } },
    }),
    prisma.customer.findMany({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { id: tenantId } }),
  ]);

  const wonInPeriod = deals.filter((d) => d.stage === "won" && d.closeDate >= periodStart && d.closeDate <= now);
  const lostInPeriod = deals.filter((d) => d.stage === "lost" && d.closeDate >= periodStart && d.closeDate <= now);
  const openDeals = deals.filter((d) => d.stage === "open");

  const wonInPrevPeriod = deals.filter((d) => d.stage === "won" && d.closeDate >= prevPeriodStart && d.closeDate < periodStart);
  const lostInPrevPeriod = deals.filter((d) => d.stage === "lost" && d.closeDate >= prevPeriodStart && d.closeDate < periodStart);

  const revenue = wonInPeriod.reduce((s, d) => s + d.value, 0);
  const prevRevenue = wonInPrevPeriod.reduce((s, d) => s + d.value, 0);
  const winRate = wonInPeriod.length + lostInPeriod.length > 0 ? (wonInPeriod.length / (wonInPeriod.length + lostInPeriod.length)) * 100 : 0;
  const prevWinRate =
    wonInPrevPeriod.length + lostInPrevPeriod.length > 0
      ? (wonInPrevPeriod.length / (wonInPrevPeriod.length + lostInPrevPeriod.length)) * 100
      : 0;

  const revenueByCustomer = new Map<string, { name: string; revenue: number }>();
  for (const d of wonInPeriod) {
    const key = d.customerId;
    const existing = revenueByCustomer.get(key);
    revenueByCustomer.set(key, {
      name: d.customer.company,
      revenue: (existing?.revenue || 0) + d.value,
    });
  }
  const topCustomers = [...revenueByCustomer.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const newCustomers = customers.filter((c) => c.createdAt >= periodStart).length;

  return {
    tenantName: tenant?.name || "the team",
    periodStart,
    periodEnd: now,
    periodDays,
    revenue,
    prevRevenue,
    revenueDeltaPct: prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 1000) / 10 : null,
    dealsWonCount: wonInPeriod.length,
    dealsLostCount: lostInPeriod.length,
    openDealsCount: openDeals.length,
    openPipelineValue: openDeals.reduce((s, d) => s + d.value, 0),
    winRate: Math.round(winRate * 10) / 10,
    prevWinRate: Math.round(prevWinRate * 10) / 10,
    newCustomers,
    totalActiveCustomers: customers.filter((c) => c.status === "active").length,
    totalCustomers: customers.length,
    topCustomers,
  };
}

export type PeriodSummary = Awaited<ReturnType<typeof gatherPeriodSummary>>;
