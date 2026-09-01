import { prisma } from "@/lib/db";
import type { ActivityType } from "@prisma/client";

export async function logActivity(params: {
  tenantId: string;
  userId?: string | null;
  type: ActivityType;
  description: string;
}) {
  return prisma.activity.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId ?? null,
      type: params.type,
      description: params.description,
    },
  });
}
