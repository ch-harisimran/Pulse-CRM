"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function SortHeader({
  label,
  field,
  currentSort,
  currentOrder,
  onSort,
  className,
}: {
  label: string;
  field: string;
  currentSort: string;
  currentOrder: "asc" | "desc";
  onSort: (field: string) => void;
  className?: string;
}) {
  const active = currentSort === field;
  return (
    <TableHead className={cn("select-none", className)}>
      <button
        onClick={() => onSort(field)}
        className={cn(
          "flex items-center gap-1 transition-colors hover:text-foreground",
          active && "text-foreground"
        )}
      >
        {label}
        <motion.span animate={{ rotate: active && currentOrder === "asc" ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className={cn("h-3.5 w-3.5", !active && "opacity-30")} />
        </motion.span>
      </button>
    </TableHead>
  );
}
