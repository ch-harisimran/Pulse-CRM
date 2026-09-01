"use client";
import type React from "react";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Handshake,
  FileText,
  UsersRound,
  ShieldCheck,
  Settings,
  Search,
  DollarSign,
  Sparkles,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useSession } from "@/lib/session-context";
import { toast } from "sonner";

type SearchData = {
  customers: { id: string; name: string; company: string; email: string }[];
  deals: { id: string; title: string; value: number; stage: string; customer: { name: string } }[];
};

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const { user } = useSession();
  const [data, setData] = useState<SearchData>({ customers: [], deals: [] });
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  useEffect(() => {
    if (open && !loaded) {
      fetch("/api/search")
        .then((r) => r.json())
        .then((d) => {
          setData(d);
          setLoaded(true);
        });
    }
  }, [open, loaded]);

  const go = useCallback(
    (href: string) => {
      router.push(href);
      onOpenChange(false);
    },
    [router, onOpenChange]
  );

  const askAI = useCallback(
    async (query: string) => {
      setAsking(true);
      const toastId = toast.loading(`Asking Pulse AI: "${query}"`);
      try {
        const res = await fetch("/api/ai/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Query failed");

        const params = new URLSearchParams();
        if (result.filters?.stage) params.set("stage", result.filters.stage);
        if (result.filters?.min_value) params.set("minValue", String(result.filters.min_value));
        if (result.filters?.max_value) params.set("maxValue", String(result.filters.max_value));
        if (result.filters?.date_from) params.set("dateFrom", result.filters.date_from);
        if (result.filters?.date_to) params.set("dateTo", result.filters.date_to);
        params.set("aiQuery", query);

        toast.success(`Found ${result.total} matching deal${result.total === 1 ? "" : "s"}`, { id: toastId });
        router.push(`/deals?${params.toString()}`);
        onOpenChange(false);
        setSearch("");
      } catch (err: any) {
        toast.error(err?.message || "Couldn't process that query", { id: toastId });
      } finally {
        setAsking(false);
      }
    },
    [router, onOpenChange]
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-24">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -12 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="w-full max-w-lg"
            >
            <Command
              className="overflow-hidden rounded-xl border border-border bg-popover shadow-card-hover"
              shouldFilter
            >
              <div className="flex items-center gap-2 border-b border-border px-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Command.Input
                  autoFocus
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Jump to customers, deals, or ask a question…"
                  className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
                />
                <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">esc</kbd>
              </div>
              <Command.List className="max-h-[420px] overflow-y-auto p-2 scrollbar-thin">
                <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>

                {search.trim().length > 3 && (
                  <Command.Group heading="Ask Pulse AI" className="px-2 py-1.5 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:mb-1">
                    <Command.Item
                      value={search}
                      onSelect={() => askAI(search.trim())}
                      disabled={asking}
                      className="flex cursor-pointer items-center gap-3 rounded-lg bg-gradient-to-r from-emerald-500/5 to-sky-500/5 px-2.5 py-2.5 text-sm ring-1 ring-emerald-500/10 aria-selected:bg-secondary"
                    >
                      {asking ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-600" />
                      ) : (
                        <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
                      )}
                      <span className="truncate">
                        Ask AI: <span className="font-medium text-foreground">&ldquo;{search.trim()}&rdquo;</span>
                      </span>
                    </Command.Item>
                  </Command.Group>
                )}

                <Command.Group heading="Pages" className="px-2 py-1.5 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:mb-1">
                  <PaletteItem icon={LayoutDashboard} label="Dashboard" onSelect={() => go("/dashboard")} />
                  <PaletteItem icon={Users} label="Customers" onSelect={() => go("/customers")} />
                  <PaletteItem icon={Handshake} label="Deals" onSelect={() => go("/deals")} />
                  <PaletteItem icon={FileText} label="Reports" onSelect={() => go("/reports")} />
                  <PaletteItem icon={UsersRound} label="Team" onSelect={() => go("/team")} />
                  {user.role === "admin" && (
                    <PaletteItem icon={ShieldCheck} label="Audit Log" onSelect={() => go("/audit-log")} />
                  )}
                  <PaletteItem icon={Settings} label="Settings" onSelect={() => go("/settings")} />
                </Command.Group>

                {data.customers.length > 0 && (
                  <Command.Group heading="Customers" className="px-2 py-1.5 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:mb-1 [&_[cmdk-group-heading]]:mt-2">
                    {data.customers.slice(0, 30).map((c) => (
                      <PaletteItem
                        key={c.id}
                        icon={Users}
                        label={c.name}
                        sublabel={c.company}
                        value={`${c.name} ${c.company} ${c.email}`}
                        onSelect={() => go(`/customers?highlight=${c.id}`)}
                      />
                    ))}
                  </Command.Group>
                )}

                {data.deals.length > 0 && (
                  <Command.Group heading="Deals" className="px-2 py-1.5 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:mb-1 [&_[cmdk-group-heading]]:mt-2">
                    {data.deals.slice(0, 30).map((d) => (
                      <PaletteItem
                        key={d.id}
                        icon={DollarSign}
                        label={d.title}
                        sublabel={`${d.customer.name} · ${formatCurrency(d.value)}`}
                        value={`${d.title} ${d.customer.name} ${d.stage}`}
                        onSelect={() => go(`/deals?highlight=${d.id}`)}
                      />
                    ))}
                  </Command.Group>
                )}
              </Command.List>
            </Command>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function PaletteItem({
  icon: Icon,
  label,
  sublabel,
  value,
  onSelect,
}: {
  icon: React.ElementType;
  label: string;
  sublabel?: string;
  value?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={value || label}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm aria-selected:bg-secondary"
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate font-medium">{label}</span>
      {sublabel && <span className="ml-auto truncate text-xs text-muted-foreground">{sublabel}</span>}
    </Command.Item>
  );
}
