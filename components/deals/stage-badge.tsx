import { Badge } from "@/components/ui/badge";

const MAP: Record<string, "info" | "success" | "destructive"> = {
  open: "info",
  won: "success",
  lost: "destructive",
};

export function DealStageBadge({ stage }: { stage: string }) {
  return <Badge variant={MAP[stage] || "secondary"} className="capitalize">{stage}</Badge>;
}
