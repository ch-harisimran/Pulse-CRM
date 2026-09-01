"use client";
import type React from "react";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Responsive, WidthProvider, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { GripVertical, LayoutGrid, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ResponsiveGridLayout = WidthProvider(Responsive);

export const DEFAULT_LAYOUT: Layout[] = [
  { i: "kpi-revenue", x: 0, y: 0, w: 3, h: 3, minW: 2, minH: 3 },
  { i: "kpi-deals", x: 3, y: 0, w: 3, h: 3, minW: 2, minH: 3 },
  { i: "kpi-winrate", x: 6, y: 0, w: 3, h: 3, minW: 2, minH: 3 },
  { i: "kpi-customers", x: 9, y: 0, w: 3, h: 3, minW: 2, minH: 3 },
  { i: "chart-revenue", x: 0, y: 3, w: 8, h: 6, minW: 4, minH: 4 },
  { i: "chart-winloss", x: 8, y: 3, w: 4, h: 6, minW: 3, minH: 4 },
  { i: "chart-pipeline", x: 0, y: 9, w: 8, h: 6, minW: 4, minH: 4 },
  { i: "activity", x: 8, y: 9, w: 4, h: 6, minW: 3, minH: 4 },
];

export function WidgetShell({ id, editing, children }: { id: string; editing: boolean; children: React.ReactNode }) {
  return (
    <div className="group relative h-full">
      {editing && (
        <div className="widget-drag-handle absolute -top-2.5 left-1/2 z-10 flex -translate-x-1/2 cursor-grab items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-card active:cursor-grabbing">
          <GripVertical className="h-3 w-3" /> drag
        </div>
      )}
      <div className={editing ? "pointer-events-none h-full opacity-95 ring-2 ring-emerald-500/20 rounded-xl" : "h-full"}>
        {children}
      </div>
    </div>
  );
}

export function DashboardGrid({ children }: { children: Record<string, React.ReactNode> }) {
  const [layout, setLayout] = useState<Layout[]>(DEFAULT_LAYOUT);
  const [editing, setEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/layout")
      .then((r) => r.json())
      .then((d) => {
        if (d.widgetConfig && Array.isArray(d.widgetConfig)) {
          setLayout(d.widgetConfig as Layout[]);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const onLayoutChange = useCallback(
    (next: Layout[]) => {
      if (!loaded) return;
      setLayout(next);
      setDirty(true);
    },
    [loaded]
  );

  async function saveLayout() {
    await fetch("/api/dashboard/layout", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(layout),
    });
    setDirty(false);
    setEditing(false);
    toast.success("Dashboard layout saved");
  }

  function resetLayout() {
    setLayout(DEFAULT_LAYOUT);
    setDirty(true);
    toast("Layout reset to default — click Save to keep it");
  }

  const layouts = useMemo(() => ({ lg: layout, md: layout, sm: layout }), [layout]);

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        {editing && (
          <Button variant="outline" size="sm" onClick={resetLayout}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        )}
        <Button variant={editing ? "default" : "outline"} size="sm" onClick={() => (editing ? saveLayout() : setEditing(true))}>
          {editing ? (
            <>
              <Check className="h-3.5 w-3.5" /> Save layout
            </>
          ) : (
            <>
              <LayoutGrid className="h-3.5 w-3.5" /> Customize layout
            </>
          )}
        </Button>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1024, md: 768, sm: 0 }}
        cols={{ lg: 12, md: 12, sm: 1 }}
        rowHeight={40}
        margin={[16, 16]}
        isDraggable={editing}
        isResizable={editing}
        draggableHandle=".widget-drag-handle"
        onLayoutChange={onLayoutChange}
        compactType="vertical"
      >
        {layout.map((item) => (
          <div key={item.i}>
            <WidgetShell id={item.i} editing={editing}>
              {children[item.i]}
            </WidgetShell>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
