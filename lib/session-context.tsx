"use client";
import type React from "react";

import { createContext, useContext } from "react";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  avatarColor: string;
};

export type SessionTenant = {
  id: string;
  name: string;
  slug: string;
};

const SessionContext = createContext<{ user: SessionUser; tenant: SessionTenant } | null>(null);

export function SessionProvider({
  user,
  tenant,
  children,
}: {
  user: SessionUser;
  tenant: SessionTenant;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={{ user, tenant }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
