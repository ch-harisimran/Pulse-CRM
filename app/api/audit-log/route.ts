import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = 20;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { name: true, avatarColor: true } } },
    }),
    prisma.auditLog.count({ where: { tenantId: session.tenantId } }),
  ]);

  return NextResponse.json({ logs, total, page, pageSize });
}
