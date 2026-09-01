import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Only admins can invite team members." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "That email is already part of a workspace." }, { status: 409 });
  }

  // No real email sending in this local-only build — log the invite as if a transactional
  // email were dispatched, and record it in the activity feed for visibility.
  // eslint-disable-next-line no-console
  console.log(
    `[Pulse] Simulated invite email → to: ${parsed.data.email}, role: ${parsed.data.role}, invited by: ${session.email}`
  );

  await logActivity({
    tenantId: session.tenantId,
    userId: session.userId,
    type: "member_invited",
    description: `${session.name} invited ${parsed.data.email} to join as ${parsed.data.role === "admin" ? "an admin" : "a member"}`,
  });

  return NextResponse.json({ ok: true, message: `Invite sent to ${parsed.data.email} (simulated — logged to server console).` });
}
