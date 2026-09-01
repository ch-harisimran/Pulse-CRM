import {
  LayoutDashboard,
  Users,
  Handshake,
  FileText,
  UsersRound,
  ShieldCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Deals", href: "/deals", icon: Handshake },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Team", href: "/team", icon: UsersRound },
  { label: "Audit Log", href: "/audit-log", icon: ShieldCheck, adminOnly: true },
  { label: "Settings", href: "/settings", icon: Settings },
];
