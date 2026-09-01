import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  const [user, tenant] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.tenant.findUnique({ where: { id: session.tenantId } }),
  ]);
  if (!user || !tenant) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarColor: user.avatarColor },
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
  });
}
