"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { InviteDialog } from "@/components/team/invite-dialog";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { useSession } from "@/lib/session-context";
import { initials } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

type Member = { id: string; name: string; email: string; role: "admin" | "member"; avatarColor: string; createdAt: string };

export default function TeamPage() {
  const { user } = useSession();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const load = useCallback(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((d) => setMembers(d.users));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function changeRole(memberId: string, role: string) {
    const res = await fetch(`/api/team/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed to update role");
      return;
    }
    toast.success("Role updated");
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">{members?.length ?? "—"} members in Brightpath Studio</p>
        </div>
        {user.role === "admin" && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" /> Invite teammate
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          {members === null &&
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[76px] rounded-xl" />)}

          {members?.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-11 w-11">
                    <AvatarFallback style={{ backgroundColor: m.avatarColor + "22", color: m.avatarColor }}>
                      {initials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{m.name}</p>
                      {m.id === user.id && <span className="text-xs text-muted-foreground">(you)</span>}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <p className="hidden text-xs text-muted-foreground sm:block">Joined {format(new Date(m.createdAt), "MMM d, yyyy")}</p>
                  {user.role === "admin" && m.id !== user.id ? (
                    <Select value={m.role} onValueChange={(v) => changeRole(m.id, v)}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={m.role === "admin" ? "admin" : "member"} className="gap-1">
                      {m.role === "admin" && <ShieldCheck className="h-3 w-3" />}
                      {m.role}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <ActivityFeed limit={10} />
      </div>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} onInvited={load} />
    </div>
  );
}
