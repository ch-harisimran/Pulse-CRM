import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { logAudit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().min(1),
  status: z.enum(["lead", "active", "churned"]).default("lead"),
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const status = searchParams.get("status") || "";
  const sort = searchParams.get("sort") || "createdAt";
  const order = (searchParams.get("order") === "asc" ? "asc" : "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10)));

  const where: Prisma.CustomerWhereInput = {
    tenantId: session.tenantId,
    ...(status ? { status: status as any } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { company: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const sortableFields = ["name", "email", "company", "status", "createdAt"];
  const orderBy = { [sortableFields.includes(sort) ? sort : "createdAt"]: order };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { deals: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({ customers, total, page, pageSize });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const customer = await prisma.customer.create({
    data: { ...parsed.data, tenantId: session.tenantId },
  });

  await Promise.all([
    logActivity({
      tenantId: session.tenantId,
      userId: session.userId,
      type: "customer_added",
      description: `${session.name} added new customer contact ${customer.name} at ${customer.company}`,
    }),
    logAudit({
      tenantId: session.tenantId,
      userId: session.userId,
      action: "create",
      entityType: "customer",
      entityId: customer.id,
      after: customer,
    }),
  ]);

  return NextResponse.json({ customer }, { status: 201 });
}
