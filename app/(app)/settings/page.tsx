"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Info, ShieldAlert } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { IntegrationCard } from "@/components/settings/integration-card";
import { useSession } from "@/lib/session-context";
import { toast } from "sonner";
import { format } from "date-fns";

type Integration = { id: string; key: string; enabled: boolean };
type ScheduledSetting = { enabled: boolean; lastRunAt: string | null } | null;

export default function SettingsPage() {
  const { user, tenant } = useSession();
  const isAdmin = user.role === "admin";

  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  const [scheduled, setScheduled] = useState<ScheduledSetting>(null);
  const [scheduledLoading, setScheduledLoading] = useState(false);

  function loadIntegrations() {
    fetch("/api/settings/integrations")
      .then((r) => r.json())
      .then((d) => setIntegrations(d.integrations));
  }
  function loadScheduled() {
    fetch("/api/settings/scheduled-report")
      .then((r) => r.json())
      .then((d) => setScheduled(d.setting));
  }

  useEffect(() => {
    loadIntegrations();
    loadScheduled();
  }, []);

  async function toggleIntegration(key: string, enabled: boolean) {
    const res = await fetch("/api/settings/integrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, enabled }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to update integration");
      return;
    }
    toast.success(`${enabled ? "Connected" : "Disconnected"}`);
    loadIntegrations();
  }

  async function toggleScheduled(enabled: boolean) {
    setScheduledLoading(true);
    const res = await fetch("/api/settings/scheduled-report", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    const data = await res.json().catch(() => ({}));
    setScheduledLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Failed to update setting");
      return;
    }
    setScheduled(data.setting);
    if (enabled) {
      toast.success("Weekly summaries enabled — a backdated sample report was generated.");
    } else {
      toast.success("Weekly summaries disabled");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage {tenant.name}'s workspace preferences.</p>
      </div>

      {!isAdmin && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
        >
          <ShieldAlert className="h-4 w-4 shrink-0" />
          You're viewing settings as a member. Only admins can make changes here.
        </motion.div>
      )}

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="reports">Scheduled Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Workspace</CardTitle>
              <CardDescription>Basic information about your tenant.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Workspace name</p>
                  <p className="text-xs text-muted-foreground">{tenant.name}</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Workspace URL</p>
                  <p className="text-xs text-muted-foreground">localhost:3000/{tenant.slug}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                This is a local-only demo build — workspace name and URL editing isn't wired up, but every other control on this page is fully functional.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-3">
          {integrations === null &&
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[84px] rounded-xl" />)}
          {integrations?.map((integration, i) => (
            <IntegrationCard
              key={integration.key}
              integrationKey={integration.key}
              enabled={integration.enabled}
              disabled={!isAdmin}
              onToggle={(v) => toggleIntegration(integration.key, v)}
              index={i}
            />
          ))}
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Weekly AI summaries</CardTitle>
              <CardDescription>Automatically generate and "email" an executive summary every week.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Calendar className="h-[18px] w-[18px] text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Auto-generate weekly summary</p>
                    <p className="text-xs text-muted-foreground">
                      {scheduled?.lastRunAt
                        ? `Last run ${format(new Date(scheduled.lastRunAt), "MMM d, yyyy 'at' h:mm a")}`
                        : "Not run yet"}
                    </p>
                  </div>
                </div>
                <Switch checked={!!scheduled?.enabled} disabled={!isAdmin || scheduledLoading} onCheckedChange={toggleScheduled} />
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Since this build doesn't send real email, turning this on immediately generates a backdated sample report
                in your Reports history and logs a simulated "email sent" message to the server console.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
