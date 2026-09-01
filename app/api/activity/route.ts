import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "20", 10));

  const activities = await prisma.activity.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, avatarColor: true } } },
  });

  return NextResponse.json({ activities });
}
