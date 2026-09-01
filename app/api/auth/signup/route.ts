import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input." }, { status: 400 });
  }
  const { name, email, password, companyName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const baseSlug = slugify(companyName) || "team";
  let slug = baseSlug;
  let n = 1;
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++n}`;
  }

  const passwordHash = await hashPassword(password);

  const tenant = await prisma.tenant.create({
    data: {
      name: companyName,
      slug,
      users: {
        create: {
          name,
          email: email.toLowerCase(),
          passwordHash,
          role: "admin",
        },
      },
      integrations: {
        create: [
          { key: "slack", enabled: false },
          { key: "zapier", enabled: false },
          { key: "google_sheets", enabled: false },
        ],
      },
      scheduledReport: { create: { enabled: false } },
    },
    include: { users: true },
  });

  const user = tenant.users[0];

  await logActivity({
    tenantId: tenant.id,
    userId: user.id,
    type: "member_joined",
    description: `${user.name} created the ${tenant.name} workspace`,
  });

  await setSessionCookie({
    userId: user.id,
    tenantId: tenant.id,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  return NextResponse.json({ ok: true });
}
