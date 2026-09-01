"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ShieldCheck, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { useSession } from "@/lib/session-context";
import { ShieldAlert } from "lucide-react";

type LogItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  user: { name: string; avatarColor: string } | null;
};

const ACTION_META: Record<string, { icon: any; color: string }> = {
  create: { icon: Plus, color: "#10B981" },
  update: { icon: Pencil, color: "#0EA5E9" },
  delete: { icon: Trash2, color: "#F43F5E" },
};

export default function AuditLogPage() {
  const { user } = useSession();
  const [logs, setLogs] = useState<LogItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (user.role !== "admin") {
      setForbidden(true);
      return;
    }
    setLogs(null);
    fetch(`/api/audit-log?page=${page}`)
      .then(async (r) => {
        if (r.status === 403) {
          setForbidden(true);
          return { logs: [], total: 0 };
        }
        return r.json();
      })
      .then((d) => {
        setLogs(d.logs || []);
        setTotal(d.total || 0);
      });
  }, [page, user.role]);

  if (forbidden) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
        <ShieldAlert className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Admins only</p>
          <p className="text-sm text-muted-foreground">Ask a workspace admin if you need access to the audit log.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ShieldCheck className="h-6 w-6 text-emerald-500" /> Audit Log
        </h1>
        <p className="text-sm text-muted-foreground">A complete record of every data change in your workspace.</p>
      </div>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {logs === null &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}

          {logs !== null && logs.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">No changes recorded yet.</div>
          )}

          {logs?.map((log, i) => {
            const meta = ACTION_META[log.action] || ACTION_META.update;
            const Icon = meta.icon;
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
                className="flex items-center gap-3 p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: meta.color + "18" }}>
                  <Icon className="h-4 w-4" style={{ color: meta.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    {log.user ? <span className="font-medium">{log.user.name}</span> : <span className="font-medium">System</span>}{" "}
                    <Badge variant="outline" className="capitalize">{log.action}d</Badge>{" "}
                    <span className="text-muted-foreground">a {log.entityType.replace("_", " ")}</span>
                    {log.entityId && <span className="text-muted-foreground"> · {log.entityId.slice(0, 10)}</span>}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                </span>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

      {total > 0 && <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />}
    </div>
  );
}
