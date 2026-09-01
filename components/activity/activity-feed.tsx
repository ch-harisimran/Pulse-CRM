"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ACTIVITY_ICON } from "./activity-icon";
import { Inbox } from "lucide-react";

type ActivityItem = {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  user: { name: string; avatarColor: string } | null;
};

export function ActivityFeed({ limit = 12 }: { limit?: number }) {
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    fetch(`/api/activity?limit=${limit}`)
      .then((r) => r.json())
      .then((d) => setItems(d.activities))
      .catch(() => setItems([]));
  }, [limit]);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Activity feed</CardTitle>
        <CardDescription>What your team has been doing</CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-1 overflow-y-auto scrollbar-thin">
        {items === null &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}

        {items !== null && items.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No activity yet. Actions your team takes will show up here.</p>
          </div>
        )}

        {items?.map((item, i) => {
          const meta = ACTIVITY_ICON[item.type] || ACTIVITY_ICON.settings_changed;
          const Icon = meta.icon;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03 }}
              className="flex items-start gap-3 rounded-lg px-1 py-2.5 transition-colors hover:bg-secondary/50"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: meta.color + "18" }}>
                <Icon className="h-4 w-4" style={{ color: meta.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug text-foreground">{item.description}</p>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</p>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
