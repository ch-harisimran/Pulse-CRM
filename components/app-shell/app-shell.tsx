"use client";
import type React from "react";

import { useState } from "react";
import { SessionProvider, type SessionUser, type SessionTenant } from "@/lib/session-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette } from "@/components/command-palette";
import { AnimatePresence, motion } from "framer-motion";

export function AppShell({
  user,
  tenant,
  children,
}: {
  user: SessionUser;
  tenant: SessionTenant;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <SessionProvider user={user} tenant={tenant}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((c) => !c)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div
          className="flex h-screen flex-1 flex-col overflow-hidden md:pl-[var(--sidebar-w)]"
          style={{ ["--sidebar-w" as any]: collapsed ? "76px" : "248px" }}
        >
          <Topbar
            onOpenMobile={() => setMobileOpen(true)}
            onOpenPalette={() => setPaletteOpen(true)}
          />
          <main className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin md:px-8 md:py-8">
            <motion.div
              key={typeof window !== "undefined" ? window.location.pathname : "page"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </SessionProvider>
  );
}
