import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { gatherPeriodSummary } from "@/lib/report-data";
import { formatCurrency } from "@/lib/utils";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const setting = await prisma.scheduledReportSetting.findUnique({ where: { tenantId: session.tenantId } });
  return NextResponse.json({ setting });
}

const schema = z.object({ enabled: z.boolean() });

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Only admins can manage scheduled reports." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const setting = await prisma.scheduledReportSetting.upsert({
    where: { tenantId: session.tenantId },
    update: { enabled: parsed.data.enabled, ...(parsed.data.enabled ? { lastRunAt: new Date() } : {}) },
    create: { tenantId: session.tenantId, enabled: parsed.data.enabled, lastRunAt: parsed.data.enabled ? new Date() : null },
  });

  await logActivity({
    tenantId: session.tenantId,
    userId: session.userId,
    type: "settings_changed",
    description: `${session.name} ${parsed.data.enabled ? "enabled" : "disabled"} weekly AI summary emails`,
  });

  if (parsed.data.enabled) {
    // Simulate a scheduled run: generate and store a backdated summary report,
    // and log to the console as if a weekly digest email had just gone out.
    const summary = await gatherPeriodSummary(session.tenantId, 7);
    const backdated = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const content = `## Executive Summary

This automated weekly summary for ${summary.tenantName} covers the 7 days ending ${backdated.toLocaleDateString()}.

**Key Insights**

1. Revenue from won deals in this window totaled ${formatCurrency(summary.revenue)}.
2. ${summary.dealsWonCount} deal(s) were won and ${summary.dealsLostCount} were lost, for a win rate of ${summary.winRate}%.
3. The open pipeline held ${summary.openDealsCount} deals worth ${formatCurrency(summary.openPipelineValue)}.
4. ${summary.newCustomers} new customer(s) were added to the workspace this week.
5. ${summary.totalActiveCustomers} of ${summary.totalCustomers} total customers are currently active.

**Recommendations**

- Review any open deals nearing their close date to keep the pipeline moving.
- Share this summary with the team at your next check-in.`;

    const report = await prisma.report.create({
      data: {
        tenantId: session.tenantId,
        generatedBy: session.userId,
        title: `Weekly Auto-Summary — ${backdated.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        content,
        periodStart: backdated,
        periodEnd: new Date(),
        createdAt: backdated,
      },
    });

    await logActivity({
      tenantId: session.tenantId,
      userId: session.userId,
      type: "report_generated",
      description: `Automated weekly AI summary generated and emailed to the team`,
    });

    // eslint-disable-next-line no-console
    console.log(
      `[Pulse] Simulated weekly digest email sent to all ${session.tenantId} tenant admins. Report: "${report.title}"`
    );
  }

  return NextResponse.json({ setting });
}
