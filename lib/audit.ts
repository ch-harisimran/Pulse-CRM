import { prisma } from "@/lib/db";

export async function logAudit(params: {
  tenantId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  return prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      before: params.before === undefined ? undefined : (params.before as any),
      after: params.after === undefined ? undefined : (params.after as any),
    },
  });
}
