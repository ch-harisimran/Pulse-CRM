import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const layout = await prisma.dashboardLayout.findUnique({ where: { userId: session.userId } });
  return NextResponse.json({ widgetConfig: layout?.widgetConfig || null });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid layout" }, { status: 400 });

  const layout = await prisma.dashboardLayout.upsert({
    where: { userId: session.userId },
    update: { widgetConfig: body },
    create: { userId: session.userId, widgetConfig: body },
  });

  return NextResponse.json({ widgetConfig: layout.widgetConfig });
}
