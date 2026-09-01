import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const deals = await prisma.deal.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { name: true, company: true } } },
  });

  const csv = toCsv(
    deals.map((d) => ({
      title: d.title,
      customer: d.customer.name,
      company: d.customer.company,
      value: d.value,
      stage: d.stage,
      closeDate: d.closeDate.toISOString().slice(0, 10),
      createdAt: d.createdAt.toISOString().slice(0, 10),
    })),
    [
      { key: "title", label: "Deal" },
      { key: "customer", label: "Customer" },
      { key: "company", label: "Company" },
      { key: "value", label: "Value (USD)" },
      { key: "stage", label: "Stage" },
      { key: "closeDate", label: "Close Date" },
      { key: "createdAt", label: "Created At" },
    ]
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="pulse-deals-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
