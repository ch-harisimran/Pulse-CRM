"use client";
import type React from "react";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export type DealRecord = {
  id: string;
  title: string;
  value: number;
  stage: string;
  closeDate: string;
  customerId: string;
  customer?: { id: string; name: string; company: string };
};

export function DealFormDialog({
  open,
  onOpenChange,
  deal,
  onSaved,
  defaultCustomerId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  deal: DealRecord | null;
  onSaved: () => void;
  defaultCustomerId?: string;
}) {
  const [customers, setCustomers] = useState<{ id: string; name: string; company: string }[]>([]);
  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [value, setValue] = useState("");
  const [stage, setStage] = useState("open");
  const [closeDate, setCloseDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/customers?pageSize=100&sort=name&order=asc")
        .then((r) => r.json())
        .then((d) => setCustomers(d.customers));
      setTitle(deal?.title || "");
      setCustomerId(deal?.customerId || defaultCustomerId || "");
      setValue(deal ? String(deal.value) : "");
      setStage(deal?.stage || "open");
      setCloseDate(deal ? deal.closeDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
    }
  }, [open, deal, defaultCustomerId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const url = deal ? `/api/deals/${deal.id}` : "/api/deals";
    const method = deal ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, customerId, value: parseInt(value, 10), stage, closeDate }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Something went wrong");
      return;
    }
    toast.success(deal ? "Deal updated" : "Deal created");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{deal ? "Edit deal" : "New deal"}</DialogTitle>
          <DialogDescription>{deal ? "Update this deal's details." : "Create a new deal linked to a customer."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="d-title">Deal title</Label>
            <Input id="d-title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Website Redesign" />
          </div>
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} — {c.company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="d-value">Value (USD)</Label>
              <Input id="d-value" type="number" min={1} value={value} onChange={(e) => setValue(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-close">Close date</Label>
              <Input id="d-close" type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !customerId}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : deal ? "Save changes" : "Create deal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
