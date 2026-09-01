import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const schema = z.object({ role: z.enum(["admin", "member"]) });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Only admins can change roles." }, { status: 403 });

  const target = await prisma.user.findFirst({ where: { id: params.id, tenantId: session.tenantId } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  if (target.id === session.userId && parsed.data.role !== "admin") {
    const adminCount = await prisma.user.count({ where: { tenantId: session.tenantId, role: "admin" } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "You can't remove the last admin." }, { status: 400 });
    }
  }

  const updated = await prisma.user.update({ where: { id: target.id }, data: { role: parsed.data.role } });

  await logAudit({
    tenantId: session.tenantId,
    userId: session.userId,
    action: "update",
    entityType: "user_role",
    entityId: target.id,
    before: { role: target.role },
    after: { role: updated.role },
  });

  return NextResponse.json({ user: updated });
}
