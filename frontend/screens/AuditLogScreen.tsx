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
  Shield,
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
  item_name?: string;
  merchant?: string;
  merchant_domain?: string;
  category?: string;
  decision: "APPROVE" | "NEEDS_APPROVAL" | "BLOCK";
  rule_code: string;
  reason?: string;
  paypal_order_id?: string;
  metadata?: any;
}

export default function AuditLogPage() {
  const { isDeveloper, setViewMode } = useViewMode();
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
  }, []);

  // Custom Decision Cell Renderer
  const DecisionRenderer = (params: ICellRendererParams<AuditRow>) => {
    const val = params.value;
    if (val === "APPROVE") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/80 dark:text-[#3EE0A8]">
          <CheckCircle2 className="h-3 w-3" />
          APPROVE
        </span>
      );
    }
    if (val === "NEEDS_APPROVAL") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100/80 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
          <AlertTriangle className="h-3 w-3" />
          NEEDS_APPROVAL
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100/80 text-rose-800 dark:bg-rose-950/80 dark:text-rose-400">
        <XCircle className="h-3 w-3" />
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
        className="h-7 px-2 text-xs text-[#0B7A5A] dark:text-[#3EE0A8] hover:bg-emerald-50 dark:hover:bg-[#12241E] gap-1"
      >
        <Eye className="h-3.5 w-3.5" />
        <span>Inspect</span>
      </Button>
    );
  };

  const columnDefs = useMemo<ColDef<AuditRow>[]>(() => {
    return [
      {
        field: "created_at",
        headerName: "Timestamp",
        width: 170,
        valueFormatter: (params) => {
          if (!params.value) return "";
          return new Date(params.value).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
        },
      },
      {
        field: "request_id",
        headerName: "Request ID",
        width: 130,
        cellClass: "font-mono text-xs text-zinc-500",
        valueFormatter: (params) => (params.value ? params.value.slice(0, 8) : ""),
      },
      {
        field: "item_name",
        headerName: "Item / Target",
        flex: 1,
        minWidth: 160,
        cellClass: "font-semibold text-xs",
      },
      {
        field: "merchant",
        headerName: "Merchant",
        width: 140,
        cellClass: "text-xs font-mono",
      },
      {
        field: "amount_cents",
        headerName: "Amount",
        width: 110,
        cellClass: "font-heading font-bold text-xs",
        valueFormatter: (params) =>
          params.value ? `$${(params.value / 100).toFixed(2)}` : "$0.00",
      },
      {
        field: "decision",
        headerName: "Decision",
        width: 150,
        cellRenderer: DecisionRenderer,
      },
      {
        field: "rule_code",
        headerName: "Rule Code",
        width: 180,
        cellClass: "font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300",
      },
      {
        headerName: "Detail",
        width: 100,
        cellRenderer: ActionRenderer,
        sortable: false,
        filter: false,
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
        })
      : themeQuartz;
  }, [isDark]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-[#1A332B]">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">
            Comprehensive Audit Trail
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Immutable AG Grid ledger of every policy rule execution, PayPal transaction, and injection block
          </p>
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

      {/* AG Grid Container with Theming API */}
      <div
        className="w-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-[#1A332B] shadow-sm"
        style={{ height: "620px" }}
      >
        <AgGridReact<AuditRow>
          ref={gridRef}
          theme={gridTheme}
          rowData={rowData}
          columnDefs={columnDefs}
          quickFilterText={quickFilter}
          pagination={true}
          paginationPageSize={15}
          paginationPageSizeSelector={[15, 25, 50]}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
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
        <SheetContent className="sm:max-w-lg bg-white dark:bg-[#0D1C17] border-l border-zinc-200 dark:border-[#1A332B] overflow-y-auto p-6 space-y-6">
          <SheetHeader>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-5 w-5 text-[#0B7A5A] dark:text-[#3EE0A8]" />
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Audit Record Trace
              </span>
            </div>
            <SheetTitle className="font-heading text-xl font-bold">
              {selectedRow?.item_name || "Payment Request"}
            </SheetTitle>
            <SheetDescription className="text-xs text-zinc-500 font-mono">
              ID: {selectedRow?.request_id || selectedRow?.id}
            </SheetDescription>
          </SheetHeader>

          {/* Details Table */}
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#12241E] border border-zinc-200/60 dark:border-[#1E3A31] space-y-2.5">
              <div className="flex justify-between py-1 border-b border-zinc-200/40 dark:border-[#1E3A31]">
                <span className="text-zinc-500">Decision Verdict:</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {selectedRow?.decision}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-200/40 dark:border-[#1E3A31]">
                <span className="text-zinc-500">Rule Code:</span>
                <span className="font-mono font-bold text-[#0B7A5A] dark:text-[#3EE0A8]">
                  {selectedRow?.rule_code}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-200/40 dark:border-[#1E3A31]">
                <span className="text-zinc-500">Amount:</span>
                <span className="font-heading font-bold text-sm">
                  ${(((selectedRow?.amount_cents || 0) / 100)).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-200/40 dark:border-[#1E3A31]">
                <span className="text-zinc-500">Merchant / Domain:</span>
                <span className="font-mono">
                  {selectedRow?.merchant || selectedRow?.merchant_domain || "N/A"}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-zinc-500">PayPal Order ID:</span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                  {selectedRow?.paypal_order_id || "None (Not executed)"}
                </span>
              </div>
            </div>

            {/* Reason */}
            {selectedRow?.reason && (
              <div className="space-y-1">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Policy Explanation
                </span>
                <div className="p-3 rounded-lg bg-zinc-100 dark:bg-[#162E25] text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans">
                  {selectedRow.reason}
                </div>
              </div>
            )}

            {/* Raw JSON Payload */}
            <div className="space-y-1">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 font-mono text-[11px]">
                Raw Snapshot Payload
              </span>
              <pre className="p-3 rounded-lg bg-[#07100D] text-emerald-400 font-mono text-[10px] overflow-x-auto max-h-48 border border-zinc-800">
                {JSON.stringify(selectedRow, null, 2)}
              </pre>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
