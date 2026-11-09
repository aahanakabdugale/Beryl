"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, ColDef, ICellRendererParams, themeQuartz } from "ag-grid-community";
import { useTheme } from "next-themes";
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useViewMode } from "@/components/view-mode-context";
import { useInspector } from "@/components/inspector-context";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";

// Register AG Grid Community Modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface AuditRow {
  id: string;
  request_id: string;
  created_at: string;
  amount_cents: number;
  item?: string;
  item_name?: string;
  merchant?: string;
  merchant_domain?: string;
  category?: string;
  decision: "APPROVE" | "NEEDS_APPROVAL" | "BLOCK" | string;
  rule_code: string;
  reason?: string;
  reason_text?: string;
  paypal_order_id?: string;
  metadata?: any;
}

export default function AuditLogPage() {
  const { isDeveloper, setViewMode, requestDeveloperMode } = useViewMode();
  const { inspectData } = useInspector();
  const { resolvedTheme } = useTheme();
  const [rowData, setRowData] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickFilter, setQuickFilter] = useState("");
  const [selectedRow, setSelectedRow] = useState<AuditRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const gridRef = useRef<AgGridReact<AuditRow>>(null);

  if (!isDeveloper) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-[#0B7A5A] dark:text-[#3EE0A8]">
          <FileSpreadsheet className="h-7 w-7" />
        </div>
        <h2 className="font-heading text-2xl font-bold">Developer Audit Trail (AG Grid)</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
          The full AG Grid audit log includes raw JSON payloads, PayPal order IDs, and deterministic rule codes for developers. For normal orders, view your Spending Analytics.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link href="/dashboard/analytics">
            <Button variant="outline" className="text-xs rounded-full px-5 cursor-pointer">
              View Spending Analytics
            </Button>
          </Link>
          <Button
            onClick={() => setViewMode("developer")}
            className="bg-[#0B7A5A] hover:bg-[#086147] text-white rounded-full px-5 text-xs cursor-pointer"
          >
            Switch to Developer Lab Mode
          </Button>
        </div>
      </div>
    );
  }

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit");
      if (res.status === 401) {
        requestDeveloperMode(() => {
          fetchLogs();
        });
        return;
      }
      if (res.ok) {
        const data = await res.json();
        const logs = data.logs || [];
        setRowData(logs);
        if (logs.length > 0) {
          inspectData("SELECTED_AUDIT_RECORD", logs[0]);
        }
      }
    } catch {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    const handleResize = () => {
      gridRef.current?.api?.sizeColumnsToFit();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Custom Decision Cell Renderer
  const DecisionRenderer = (params: ICellRendererParams<AuditRow>) => {
    const raw = (params.value || "").toString().toUpperCase();
    if (raw.includes("APPROV") && !raw.includes("NEEDS")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-[#3EE0A8]">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-[#3EE0A8]" />
          APPROVE
        </span>
      );
    }
    if (raw.includes("NEEDS") || raw.includes("PENDING") || raw.includes("ESCALAT") || raw.includes("REVIEW")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          REVIEW
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-400">
        <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
        BLOCK
      </span>
    );
  };

  // Action Cell Renderer
  const ActionRenderer = (params: ICellRendererParams<AuditRow>) => {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setSelectedRow(params.data || null);
          setDrawerOpen(true);
        }}
        className="h-7 px-2 text-xs font-medium text-[#0B7A5A] dark:text-[#3EE0A8] hover:bg-emerald-50 dark:hover:bg-[#12241E] gap-1 cursor-pointer whitespace-nowrap overflow-visible"
      >
        <Eye className="h-3.5 w-3.5 shrink-0" />
        <span>Inspect</span>
      </Button>
    );
  };

  const columnDefs = useMemo<ColDef<AuditRow>[]>(() => {
    return [
      {
        field: "created_at",
        headerName: "Timestamp",
        width: 135,
        minWidth: 130,
        maxWidth: 145,
        suppressSizeToFit: true,
        cellClass: "text-xs font-mono",
        valueFormatter: (params) => {
          if (!params.value) return "";
          return new Date(params.value).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        },
      },
      {
        field: "request_id",
        headerName: "Request ID",
        width: 95,
        minWidth: 90,
        maxWidth: 105,
        suppressSizeToFit: true,
        cellClass: "font-mono text-xs text-zinc-500",
        valueFormatter: (params) => (params.value ? params.value.slice(0, 8) : ""),
      },
      {
        field: "item",
        headerName: "Item / Target",
        flex: 2,
        minWidth: 180,
        cellClass: "font-semibold text-sm",
        valueGetter: (params) =>
          params.data?.item || params.data?.item_name || "Payment Request",
      },
      {
        field: "merchant",
        headerName: "Merchant",
        flex: 1,
        minWidth: 120,
        cellClass: "text-xs font-mono",
        valueGetter: (params) =>
          params.data?.merchant || params.data?.merchant_domain || "Vendor",
      },
      {
        field: "amount_cents",
        headerName: "Amount",
        width: 90,
        minWidth: 90,
        maxWidth: 100,
        suppressSizeToFit: true,
        cellClass: "font-mono font-bold text-sm",
        valueFormatter: (params) =>
          params.value ? `$${(params.value / 100).toFixed(2)}` : "$0.00",
      },
      {
        field: "decision",
        headerName: "Decision",
        width: 115,
        minWidth: 110,
        maxWidth: 125,
        suppressSizeToFit: true,
        cellRenderer: DecisionRenderer,
      },
      {
        field: "rule_code",
        headerName: "Rule Code",
        flex: 1.6,
        minWidth: 180,
        cellClass: "font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300",
      },
      {
        headerName: "",
        width: 95,
        minWidth: 95,
        maxWidth: 105,
        suppressSizeToFit: true,
        cellClass: "!flex !items-center !justify-center !px-1 overflow-visible",
        cellRenderer: ActionRenderer,
        sortable: false,
        filter: false,
        resizable: false,
      },
    ];
  }, []);

  const handleExportCsv = () => {
    gridRef.current?.api.exportDataAsCsv({
      fileName: `beryl-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    toast.success("Audit log exported to CSV");
  };

  const isDark = resolvedTheme === "dark";

  const gridTheme = useMemo(() => {
    return isDark
      ? themeQuartz.withParams({
          backgroundColor: "#0D1C17",
          foregroundColor: "#EDF5F2",
          headerBackgroundColor: "#07100D",
          borderColor: "#1A332B",
          rowBorder: { color: "#162E25" },
          headerColumnBorder: { color: "transparent" },
          headerColumnResizeHandleColor: "transparent",
        })
      : themeQuartz.withParams({
          headerColumnBorder: { color: "transparent" },
          headerColumnResizeHandleColor: "transparent",
        });
  }, [isDark]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-[#1A332B]">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">
            Comprehensive Audit Trail
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
            className="text-xs gap-1.5 h-8 border-zinc-200 dark:border-zinc-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={handleExportCsv}
            className="bg-[#0B7A5A] hover:bg-[#086147] dark:bg-[#0B7A5A] dark:hover:bg-[#14966F] text-white text-xs gap-1.5 h-8 rounded-lg"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            value={quickFilter}
            onChange={(e) => setQuickFilter(e.target.value)}
            placeholder="Quick search rule codes, merchants, items..."
            className="pl-9 text-xs h-9 bg-white dark:bg-[#0D1C17] border-zinc-200 dark:border-[#1A332B]"
          />
        </div>
        <span className="text-xs font-mono text-zinc-400">
          {rowData.length} entries recorded
        </span>
      </div>

      {/* Full Page AG Grid (Auto-height, Zero Horizontal Scrolling, No Boxed Card) */}
      <div className="w-full">
        <AgGridReact<AuditRow>
          ref={gridRef}
          theme={gridTheme}
          rowData={rowData}
          columnDefs={columnDefs}
          quickFilterText={quickFilter}
          domLayout="autoHeight"
          pagination={true}
          paginationPageSize={15}
          paginationPageSizeSelector={[15, 25, 50]}
          defaultColDef={{
            sortable: true,
            filter: false,
            resizable: true,
            suppressHeaderMenuButton: true,
          }}
          autoSizeStrategy={{
            type: "fitGridWidth",
            defaultMinWidth: 70,
          }}
          onGridReady={(params) => {
            params.api.sizeColumnsToFit();
          }}
          onGridSizeChanged={(params) => {
            params.api.sizeColumnsToFit();
          }}
          onFirstDataRendered={(params) => {
            params.api.sizeColumnsToFit();
          }}
          rowSelection="single"
          onRowClicked={(e) => {
            if (e.data) {
              setSelectedRow(e.data);
              setDrawerOpen(true);
              inspectData("INSPECTED_TRANSACTION", e.data);
            }
          }}
        />
      </div>

      {/* Detail Slide-out Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="!w-full !max-w-[560px] sm:!max-w-[560px] data-[side=right]:!max-w-[560px] bg-white dark:bg-[#07100D] border-l border-zinc-200 dark:border-[#162E25] p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-6">
            <SheetHeader className="space-y-2 text-left">
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#0B7A5A] dark:text-[#3EE0A8]">
                STATUS: AUDIT RECORD TRACE
              </div>
              <SheetTitle className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white text-left leading-snug">
                {selectedRow?.item || selectedRow?.item_name || "Payment Request"}
              </SheetTitle>
              <div className="text-xs text-zinc-500 font-mono">
                ID: {selectedRow?.request_id || selectedRow?.id}
              </div>
            </SheetHeader>

            {/* Details Table */}
            <div className="border border-zinc-200 dark:border-[#162E25] bg-zinc-50/50 dark:bg-[#0D1C17] rounded-lg p-5 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between py-2 border-b border-zinc-200/60 dark:border-[#162E25]">
                <span className="text-zinc-500 font-medium">Decision Verdict</span>
                <span className={`font-bold ${
                  (selectedRow?.decision || "").toUpperCase().includes("APPROV")
                    ? "text-emerald-600 dark:text-[#3EE0A8]"
                    : (selectedRow?.decision || "").toUpperCase().includes("REVIEW") || (selectedRow?.decision || "").toUpperCase().includes("NEEDS")
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}>
                  {selectedRow?.decision}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-zinc-200/60 dark:border-[#162E25]">
                <span className="text-zinc-500 font-medium">Rule Code</span>
                <span className="font-bold text-[#0B7A5A] dark:text-[#3EE0A8]">
                  {selectedRow?.rule_code}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-zinc-200/60 dark:border-[#162E25]">
                <span className="text-zinc-500 font-medium">Amount</span>
                <span className="font-bold text-xl text-zinc-950 dark:text-white">
                  ${(((selectedRow?.amount_cents || 0) / 100)).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-zinc-200/60 dark:border-[#162E25]">
                <span className="text-zinc-500 font-medium">Merchant / Domain</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {selectedRow?.merchant || selectedRow?.merchant_domain || "N/A"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-zinc-200/60 dark:border-[#162E25]">
                <span className="text-zinc-500 font-medium">PayPal Order ID</span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {selectedRow?.paypal_order_id || "None (Blocked by Air-Gap)"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-zinc-500 font-medium">Guard Air-Gap</span>
                <span className="text-[#0B7A5A] dark:text-[#3EE0A8] font-bold">
                  Enforced &amp; Immutable
                </span>
              </div>
            </div>

            {/* Reason */}
            {(selectedRow?.reason || selectedRow?.reason_text) && (
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Policy Explanation &amp; Rationale
                </div>
                <div className="p-4 rounded-lg bg-zinc-50 dark:bg-[#0D1C17] border border-zinc-200 dark:border-[#162E25] text-xs font-mono text-zinc-800 dark:text-zinc-200 leading-relaxed break-words whitespace-pre-wrap">
                  {selectedRow.reason || selectedRow.reason_text}
                </div>
              </div>
            )}

            {/* Raw JSON Payload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Raw Snapshot Payload
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedRow, null, 2));
                    toast.success("Payload copied");
                  }}
                  className="text-xs font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-[#162E25] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                >
                  Copy JSON
                </button>
              </div>
              <pre className="p-4 rounded-lg bg-zinc-50 dark:bg-[#0D1C17] text-zinc-800 dark:text-zinc-200 font-mono text-xs overflow-x-auto max-h-52 border border-zinc-200 dark:border-[#162E25] whitespace-pre-wrap break-words leading-relaxed">
                {JSON.stringify(selectedRow, null, 2)}
              </pre>
            </div>
          </div>

          {/* Footer Close */}
          <div className="pt-6 border-t border-zinc-200 dark:border-[#162E25] flex justify-end mt-6">
            <Button
              variant="outline"
              onClick={() => setDrawerOpen(false)}
              className="px-6 h-10 font-mono font-bold text-xs rounded border border-zinc-300 dark:border-[#162E25] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#12241E] cursor-pointer"
            >
              Close Record
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
