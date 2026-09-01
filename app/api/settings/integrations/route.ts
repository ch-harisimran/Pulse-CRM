import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const integrations = await prisma.integration.findMany({ where: { tenantId: session.tenantId } });
  return NextResponse.json({ integrations });
}

const schema = z.object({ key: z.enum(["slack", "zapier", "google_sheets"]), enabled: z.boolean() });

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Only admins can manage integrations." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const integration = await prisma.integration.upsert({
    where: { tenantId_key: { tenantId: session.tenantId, key: parsed.data.key } },
    update: { enabled: parsed.data.enabled },
    create: { tenantId: session.tenantId, key: parsed.data.key, enabled: parsed.data.enabled },
  });

  const label = { slack: "Slack", zapier: "Zapier", google_sheets: "Google Sheets" }[parsed.data.key];
  await logActivity({
    tenantId: session.tenantId,
    userId: session.userId,
    type: "settings_changed",
    description: `${session.name} ${parsed.data.enabled ? "enabled" : "disabled"} the ${label} integration`,
  });

  return NextResponse.json({ integration });
}
