import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { completeOpenRouterJSON } from "@/lib/openrouter";

const QUERY_DEALS_TOOL = {
  type: "function",
  function: {
    name: "query_deals",
    description: "Extract structured filters for querying the deals pipeline from a natural-language request.",
    parameters: {
      type: "object",
      properties: {
        stage: { type: "string", enum: ["open", "won", "lost"], description: "Deal stage to filter by, if mentioned." },
        min_value: { type: "number", description: "Minimum deal value in USD, if mentioned." },
        max_value: { type: "number", description: "Maximum deal value in USD, if mentioned." },
        date_from: { type: "string", description: "ISO date (YYYY-MM-DD) start of the close-date range, if a time period is mentioned." },
        date_to: { type: "string", description: "ISO date (YYYY-MM-DD) end of the close-date range, if a time period is mentioned." },
        chart_type: { type: "string", enum: ["bar", "line", "pie"], description: "Best chart type to visualize these results." },
      },
    },
  },
};

function resolveRelativeDates(query: string): { date_from?: string; date_to?: string } {
  const now = new Date();
  const q = query.toLowerCase();
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  if (q.includes("last month")) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { date_from: iso(start), date_to: iso(end) };
  }
  if (q.includes("this month")) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { date_from: iso(start), date_to: iso(now) };
  }
  if (q.includes("last quarter") || q.includes("last 90 days")) {
    return { date_from: iso(new Date(now.getTime() - 90 * 86400000)), date_to: iso(now) };
  }
  if (q.includes("last 30 days") || q.includes("past 30 days")) {
    return { date_from: iso(new Date(now.getTime() - 30 * 86400000)), date_to: iso(now) };
  }
  if (q.includes("last week") || q.includes("past 7 days")) {
    return { date_from: iso(new Date(now.getTime() - 7 * 86400000)), date_to: iso(now) };
  }
  return {};
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const query: string = body?.query?.trim();
  if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

  let filters: any = {};
  let chartType = "bar";

  try {
    const completion = await completeOpenRouterJSON(
      [
        {
          role: "system",
          content:
            "You extract structured filters from a sales rep's natural-language question about their deals pipeline. Always call the query_deals function with whatever filters you can confidently infer. Today's date is " +
            new Date().toISOString().slice(0, 10) +
            ".",
        },
        { role: "user", content: query },
      ],
      [QUERY_DEALS_TOOL]
    );

    const toolCall = completion.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      filters = args;
      chartType = args.chart_type || "bar";
    }
  } catch (err: any) {
    // Fall back to a lightweight heuristic parse so the feature still works
    // if OPENROUTER_API_KEY isn't configured.
    const q = query.toLowerCase();
    if (q.includes("won")) filters.stage = "won";
    else if (q.includes("lost")) filters.stage = "lost";
    else if (q.includes("open")) filters.stage = "open";
    const overMatch = q.match(/over \$?([\d,]+)/);
    if (overMatch) filters.min_value = parseInt(overMatch[1].replace(/,/g, ""), 10);
    const underMatch = q.match(/under \$?([\d,]+)/);
    if (underMatch) filters.max_value = parseInt(underMatch[1].replace(/,/g, ""), 10);
  }

  const relative = resolveRelativeDates(query);
  filters.date_from = filters.date_from || relative.date_from;
  filters.date_to = filters.date_to || relative.date_to;

  const where: any = { tenantId: session.tenantId };
  if (filters.stage) where.stage = filters.stage;
  if (filters.min_value || filters.max_value) {
    where.value = {};
    if (filters.min_value) where.value.gte = filters.min_value;
    if (filters.max_value) where.value.lte = filters.max_value;
  }
  if (filters.date_from || filters.date_to) {
    where.closeDate = {};
    if (filters.date_from) where.closeDate.gte = new Date(filters.date_from);
    if (filters.date_to) where.closeDate.lte = new Date(filters.date_to);
  }

  const deals = await prisma.deal.findMany({
    where,
    orderBy: { closeDate: "desc" },
    take: 100,
    include: { customer: { select: { name: true, company: true } } },
  });

  return NextResponse.json({
    filters,
    chartType,
    deals,
    total: deals.length,
    totalValue: deals.reduce((s, d) => s + d.value, 0),
  });
}
