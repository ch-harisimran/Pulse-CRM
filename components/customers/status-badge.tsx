import { Badge } from "@/components/ui/badge";

const MAP: Record<string, "success" | "info" | "secondary"> = {
  active: "success",
  lead: "info",
  churned: "secondary",
};

export function CustomerStatusBadge({ status }: { status: string }) {
  return <Badge variant={MAP[status] || "secondary"} className="capitalize">{status}</Badge>;
}
