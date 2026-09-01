import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  customerId: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  value: z.number().int().positive().optional(),
  stage: z.enum(["open", "won", "lost"]).optional(),
  closeDate: z.string().min(1).optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deal = await prisma.deal.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    include: { customer: true },
  });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ deal });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.deal.findFirst({ where: { id: params.id, tenantId: session.tenantId }, include: { customer: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const data: any = { ...parsed.data };
  if (data.closeDate) data.closeDate = new Date(data.closeDate);

  const deal = await prisma.deal.update({
    where: { id: params.id },
    data,
    include: { customer: true },
  });

  if (parsed.data.stage && parsed.data.stage !== existing.stage) {
    await logActivity({
      tenantId: session.tenantId,
      userId: session.userId,
      type: parsed.data.stage === "won" ? "deal_won" : parsed.data.stage === "lost" ? "deal_lost" : "deal_created",
      description:
        parsed.data.stage === "won"
          ? `${session.name} closed "${deal.title}" as won ($${deal.value.toLocaleString()})`
          : parsed.data.stage === "lost"
          ? `${session.name} marked "${deal.title}" as lost`
          : `${session.name} reopened "${deal.title}"`,
    });
  }

  await logAudit({
    tenantId: session.tenantId,
    userId: session.userId,
    action: "update",
    entityType: "deal",
    entityId: deal.id,
    before: existing,
    after: deal,
  });

  return NextResponse.json({ deal });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.deal.findFirst({ where: { id: params.id, tenantId: session.tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.deal.delete({ where: { id: params.id } });

  await logAudit({
    tenantId: session.tenantId,
    userId: session.userId,
    action: "delete",
    entityType: "deal",
    entityId: params.id,
    before: existing,
  });

  return NextResponse.json({ ok: true });
}
