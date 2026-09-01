"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Pencil, Trash2, Download, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { SortHeader } from "@/components/ui/sort-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DealStageBadge } from "@/components/deals/stage-badge";
import { DealFormDialog, type DealRecord } from "@/components/deals/deal-form-dialog";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { Sparkles, X } from "lucide-react";

type DealRow = DealRecord & { customer: { id: string; name: string; company: string } };

export default function DealsPage() {
  return (
    <Suspense fallback={null}>
      <DealsPageInner />
    </Suspense>
  );
}

function DealsPageInner() {
  const searchParams = useSearchParams();
  const highlight = searchParams.get("highlight");
  const aiQuery = searchParams.get("aiQuery");

  const [rows, setRows] = useState<DealRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState(searchParams.get("stage") || "all");
  const [minValue] = useState(searchParams.get("minValue") || "");
  const [maxValue] = useState(searchParams.get("maxValue") || "");
  const [dateFrom] = useState(searchParams.get("dateFrom") || "");
  const [dateTo] = useState(searchParams.get("dateTo") || "");
  const [aiBannerVisible, setAiBannerVisible] = useState(!!aiQuery);
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DealRecord | null>(null);
  const [deleting, setDeleting] = useState<DealRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(() => {
    const params = new URLSearchParams({
      search,
      sort,
      order,
      ...(minValue ? { minValue } : {}),
      ...(maxValue ? { maxValue } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      page: String(page),
      pageSize: String(pageSize),
      ...(stage !== "all" ? { stage } : {}),
    });
    fetch(`/api/deals?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.deals);
        setTotal(d.total);
      });
  }, [search, stage, sort, order, page, minValue, maxValue, dateFrom, dateTo]);

  useEffect(() => {
    setRows(null);
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  function handleSort(field: string) {
    if (sort === field) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSort(field);
      setOrder("asc");
    }
    setPage(1);
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/deals/${deleting.id}`, { method: "DELETE" });
    setDeleteLoading(false);
    if (!res.ok) {
      toast.error("Failed to delete deal");
      return;
    }
    toast.success("Deal deleted");
    setDeleting(null);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deals</h1>
          <p className="text-sm text-muted-foreground">{total} total deals in your pipeline</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open("/api/export/deals", "_blank")}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New deal
          </Button>
        </div>
      </div>

      {aiQuery && aiBannerVisible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-gradient-to-r from-emerald-500/8 to-sky-500/8 px-4 py-2.5 text-sm"
        >
          <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="text-foreground">
            Showing results for: <span className="font-medium">&ldquo;{aiQuery}&rdquo;</span>
          </span>
          <span className="text-muted-foreground">— {total} matching deal{total === 1 ? "" : "s"}, worth {formatCurrency(rows?.reduce((s, d) => s + d.value, 0) || 0)} on this page</span>
          <button onClick={() => setAiBannerVisible(false)} className="ml-auto shrink-0 rounded p-1 text-muted-foreground hover:bg-secondary">
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search deals or customers…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={stage}
          onValueChange={(v) => {
            setStage(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <SortHeader label="Deal" field="title" currentSort={sort} currentOrder={order} onSort={handleSort} />
            <TableHead>Customer</TableHead>
            <SortHeader label="Value" field="value" currentSort={sort} currentOrder={order} onSort={handleSort} />
            <SortHeader label="Stage" field="stage" currentSort={sort} currentOrder={order} onSort={handleSort} />
            <SortHeader label="Close date" field="closeDate" currentSort={sort} currentOrder={order} onSort={handleSort} />
            <TableHead className="w-20 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows === null &&
            Array.from({ length: pageSize }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full max-w-[140px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {rows !== null && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-16 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Handshake className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No deals match your filters.</p>
                </div>
              </TableCell>
            </TableRow>
          )}

          <AnimatePresence>
            {rows?.map((d) => (
              <motion.tr
                key={d.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "group border-b border-border transition-colors hover:bg-secondary/50",
                  highlight === d.id && "bg-emerald-500/5"
                )}
              >
                <TableCell className="font-medium">{d.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {d.customer.name} <span className="text-xs">· {d.customer.company}</span>
                </TableCell>
                <TableCell className="font-medium tabular-nums">{formatCurrency(d.value)}</TableCell>
                <TableCell>
                  <DealStageBadge stage={d.stage} />
                </TableCell>
                <TableCell className="text-muted-foreground">{format(new Date(d.closeDate), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditing(d);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(d)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>

      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />

      <DealFormDialog open={formOpen} onOpenChange={setFormOpen} deal={editing} onSaved={load} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Delete deal?"
        description={`This will permanently delete "${deleting?.title}". This can't be undone.`}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
