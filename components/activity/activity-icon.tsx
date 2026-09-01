import { Handshake, Trophy, XCircle, UserPlus, FileText, Mail, UserCheck, Settings2, type LucideIcon } from "lucide-react";

export const ACTIVITY_ICON: Record<string, { icon: LucideIcon; color: string }> = {
  deal_created: { icon: Handshake, color: "#0EA5E9" },
  deal_won: { icon: Trophy, color: "#10B981" },
  deal_lost: { icon: XCircle, color: "#F43F5E" },
  customer_added: { icon: UserPlus, color: "#8B5CF6" },
  report_generated: { icon: FileText, color: "#10B981" },
  member_invited: { icon: Mail, color: "#F59E0B" },
  member_joined: { icon: UserCheck, color: "#0EA5E9" },
  settings_changed: { icon: Settings2, color: "#64748B" },
};
