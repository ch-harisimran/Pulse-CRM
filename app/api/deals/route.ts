import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { logAudit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

const createSchema = z.object({
  customerId: z.string().min(1),
  title: z.string().min(1),
  value: z.number().int().positive(),
  stage: z.enum(["open", "won", "lost"]).default("open"),
  closeDate: z.string().min(1),
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const stage = searchParams.get("stage") || "";
  const minValue = searchParams.get("minValue");
  const maxValue = searchParams.get("maxValue");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const sort = searchParams.get("sort") || "createdAt";
  const order = (searchParams.get("order") === "asc" ? "asc" : "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10)));

  const where: Prisma.DealWhereInput = {
    tenantId: session.tenantId,
    ...(stage ? { stage: stage as any } : {}),
    ...(minValue || maxValue
      ? { value: { ...(minValue ? { gte: parseInt(minValue, 10) } : {}), ...(maxValue ? { lte: parseInt(maxValue, 10) } : {}) } }
      : {}),
    ...(dateFrom || dateTo
      ? { closeDate: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), ...(dateTo ? { lte: new Date(dateTo) } : {}) } }
      : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { customer: { name: { contains: search, mode: "insensitive" } } },
            { customer: { company: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const sortableFields = ["title", "value", "stage", "closeDate", "createdAt"];
  const orderBy = { [sortableFields.includes(sort) ? sort : "createdAt"]: order };

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { customer: { select: { id: true, name: true, company: true } } },
    }),
    prisma.deal.count({ where }),
  ]);

  return NextResponse.json({ deals, total, page, pageSize });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const customer = await prisma.customer.findFirst({ where: { id: parsed.data.customerId, tenantId: session.tenantId } });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const deal = await prisma.deal.create({
    data: {
      tenantId: session.tenantId,
      customerId: parsed.data.customerId,
      title: parsed.data.title,
      value: parsed.data.value,
      stage: parsed.data.stage,
      closeDate: new Date(parsed.data.closeDate),
    },
    include: { customer: { select: { id: true, name: true, company: true } } },
  });

  await Promise.all([
    logActivity({
      tenantId: session.tenantId,
      userId: session.userId,
      type: deal.stage === "won" ? "deal_won" : deal.stage === "lost" ? "deal_lost" : "deal_created",
      description: `${session.name} created a new deal for ${customer.company}: "${deal.title}"`,
    }),
    logAudit({
      tenantId: session.tenantId,
      userId: session.userId,
      action: "create",
      entityType: "deal",
      entityId: deal.id,
      after: deal,
    }),
  ]);

  return NextResponse.json({ deal }, { status: 201 });
}
