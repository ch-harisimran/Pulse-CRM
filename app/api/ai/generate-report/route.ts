import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { gatherPeriodSummary } from "@/lib/report-data";
import { streamOpenRouterCompletion } from "@/lib/openrouter";
import { logActivity } from "@/lib/activity";
import { formatCurrency } from "@/lib/utils";

export const runtime = "nodejs";

function buildPrompt(summary: Awaited<ReturnType<typeof gatherPeriodSummary>>) {
  const system = `You are a sharp, no-nonsense revenue operations analyst writing an internal executive summary for a small agency's leadership team. Write in clear, concise prose. Use markdown with a "## Executive Summary" heading, then a "**Key Insights**" section with 3-5 numbered insights grounded strictly in the data provided, then a "**Recommendations**" section with 1-2 concrete, actionable recommendations. Do not invent numbers that are not implied by the data. Keep the whole report under 350 words.`;

  const user = `Here is the structured data for ${summary.tenantName}'s current reporting period (last ${summary.periodDays} days):

- Revenue (won deals): ${formatCurrency(summary.revenue)}${
    summary.revenueDeltaPct !== null ? ` (${summary.revenueDeltaPct >= 0 ? "+" : ""}${summary.revenueDeltaPct}% vs prior period)` : ""
  }
- Deals won: ${summary.dealsWonCount}
- Deals lost: ${summary.dealsLostCount}
- Win rate: ${summary.winRate}% (prior period: ${summary.prevWinRate}%)
- Open pipeline: ${summary.openDealsCount} deals worth ${formatCurrency(summary.openPipelineValue)}
- New customers added: ${summary.newCustomers}
- Total active customers: ${summary.totalActiveCustomers} (of ${summary.totalCustomers} total)
- Top customers by revenue this period: ${
    summary.topCustomers.length
      ? summary.topCustomers.map((c) => `${c.name} (${formatCurrency(c.revenue)})`).join(", ")
      : "none closed this period"
  }

Write the executive summary now.`;

  return { system, user };
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const periodDays = typeof body?.periodDays === "number" ? body.periodDays : 30;

  const summary = await gatherPeriodSummary(session.tenantId, periodDays);
  const { system, user } = buildPrompt(summary);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = "";
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }
      try {
        for await (const chunk of streamOpenRouterCompletion([
          { role: "system", content: system },
          { role: "user", content: user },
        ])) {
          fullText += chunk;
          send("delta", { text: chunk });
        }

        const title = `Executive Summary — ${new Date(summary.periodStart).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} to ${new Date(summary.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

        const report = await prisma.report.create({
          data: {
            tenantId: session.tenantId,
            generatedBy: session.userId,
            title,
            content: fullText || "The report could not be generated.",
            periodStart: summary.periodStart,
            periodEnd: summary.periodEnd,
          },
        });

        await logActivity({
          tenantId: session.tenantId,
          userId: session.userId,
          type: "report_generated",
          description: `${session.name} generated an AI executive summary for the current period`,
        });

        send("done", { reportId: report.id, title: report.title, createdAt: report.createdAt });
      } catch (err: any) {
        send("error", { message: err?.message || "Failed to generate report." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
