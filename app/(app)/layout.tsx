import type React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/app-shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, tenant] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.tenant.findUnique({ where: { id: session.tenantId } }),
  ]);
  if (!user || !tenant) redirect("/login");

  return (
    <AppShell
      user={{ id: user.id, name: user.name, email: user.email, role: user.role, avatarColor: user.avatarColor }}
      tenant={{ id: tenant.id, name: tenant.name, slug: tenant.slug }}
    >
      {children}
    </AppShell>
  );
}
