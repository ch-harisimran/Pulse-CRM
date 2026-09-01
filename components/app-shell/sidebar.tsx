"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Activity, ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import { useSession } from "@/lib/session-context";
import { cn } from "@/lib/utils";

function SidebarContent({ collapsed, onToggleCollapsed, onNavigate, showCollapseControl = true }: {
  collapsed: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
  showCollapseControl?: boolean;
}) {
  const { tenant } = useSession();
  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center gap-2.5 px-4 py-5", collapsed && "justify-center px-2")}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-sky-500">
          <Activity className="h-[18px] w-[18px] text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">Pulse</p>
            <p className="truncate text-xs text-muted-foreground leading-tight">{tenant.name}</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />
      </div>

      {showCollapseControl && (
        <div className="border-t border-border p-3">
          <button
            onClick={onToggleCollapsed}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
          </button>
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  return (
    <>
      {/* Desktop */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 248 }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-card md:block"
      >
        <SidebarContent collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} />
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 w-[260px] border-r border-border bg-card md:hidden"
            >
              <button
                onClick={onCloseMobile}
                className="absolute right-3 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
              <SidebarContent collapsed={false} onNavigate={onCloseMobile} showCollapseControl={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
