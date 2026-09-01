"use client";

import { motion } from "framer-motion";
import { Blocks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { INTEGRATION_META } from "./integration-meta";

export function IntegrationCard({
  integrationKey,
  enabled,
  disabled,
  onToggle,
  index,
}: {
  integrationKey: string;
  enabled: boolean;
  disabled?: boolean;
  onToggle: (v: boolean) => void;
  index: number;
}) {
  const meta = INTEGRATION_META[integrationKey];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.06 }}>
      <Card>
        <CardContent className="flex items-start gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: meta.color + "15" }}>
            <Blocks className="h-5 w-5" style={{ color: meta.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{meta.name}</p>
              {enabled && <Badge variant="success">Connected</Badge>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
          </div>
          <Switch checked={enabled} disabled={disabled} onCheckedChange={onToggle} />
        </CardContent>
      </Card>
    </motion.div>
  );
}
