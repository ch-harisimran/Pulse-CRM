import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const customers = await prisma.customer.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { deals: true } } },
  });

  const csv = toCsv(
    customers.map((c) => ({
      name: c.name,
      email: c.email,
      company: c.company,
      status: c.status,
      deals: c._count.deals,
      createdAt: c.createdAt.toISOString().slice(0, 10),
    })),
    [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "company", label: "Company" },
      { key: "status", label: "Status" },
      { key: "deals", label: "Deals" },
      { key: "createdAt", label: "Created At" },
    ]
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="pulse-customers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
