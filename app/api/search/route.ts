import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [customers, deals] = await Promise.all([
    prisma.customer.findMany({
      where: { tenantId: session.tenantId },
      select: { id: true, name: true, company: true, email: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.deal.findMany({
      where: { tenantId: session.tenantId },
      select: { id: true, title: true, value: true, stage: true, customer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return NextResponse.json({ customers, deals });
}
