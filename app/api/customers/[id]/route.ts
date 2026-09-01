import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  company: z.string().min(1).optional(),
  status: z.enum(["lead", "active", "churned"]).optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customer = await prisma.customer.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    include: { deals: { orderBy: { createdAt: "desc" } } },
  });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ customer });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.customer.findFirst({ where: { id: params.id, tenantId: session.tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const customer = await prisma.customer.update({
    where: { id: params.id },
    data: parsed.data,
  });

  await logAudit({
    tenantId: session.tenantId,
    userId: session.userId,
    action: "update",
    entityType: "customer",
    entityId: customer.id,
    before: existing,
    after: customer,
  });

  return NextResponse.json({ customer });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.customer.findFirst({ where: { id: params.id, tenantId: session.tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.customer.delete({ where: { id: params.id } });

  await logAudit({
    tenantId: session.tenantId,
    userId: session.userId,
    action: "delete",
    entityType: "customer",
    entityId: params.id,
    before: existing,
  });

  return NextResponse.json({ ok: true });
}
