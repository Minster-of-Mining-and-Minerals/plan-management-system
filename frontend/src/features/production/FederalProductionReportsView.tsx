"use client";

import { useState, useMemo } from "react";
import {
  ClipboardCheck,
  Building2,
  Scale,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Filter,
  RefreshCw,
  Search,
  Eye,
  Calendar,
  MessageSquare,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import Loading01 from "@/features/template/component/Loading/Loading01";

import {
  useGetReportsQuery,
  useReviewReportMutation,
  useGetProductionItemsQuery,
} from "@/redux/api/productionApi";
import { useGetCompaniesQuery } from "@/redux/api/companyApi";
import type { CompanyProductionReport } from "@/redux/types/production";

export function FederalProductionReportsView() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [selectedItemId, setSelectedItemId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(15);

  // Review Modal State
  const [activeReport, setActiveReport] = useState<CompanyProductionReport | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected">("approved");
  const [reviewComments, setReviewComments] = useState("");
  const [reviewError, setReviewError] = useState("");

  const queryParams = useMemo(() => {
    const p: any = { page, limit };
    if (selectedCompanyId !== "all") p.company_id = selectedCompanyId;
    if (selectedItemId !== "all") p.production_item_id = selectedItemId;
    if (selectedStatus !== "all") p.status = selectedStatus;
    if (startDate) p.start_date = startDate;
    if (endDate) p.end_date = endDate;
    return p;
  }, [selectedCompanyId, selectedItemId, selectedStatus, startDate, endDate, page, limit]);

  const { data: reportsData, isLoading, isFetching, refetch } = useGetReportsQuery(queryParams);
  const { data: companies = [] } = useGetCompaniesQuery();
  const { data: items = [] } = useGetProductionItemsQuery();
  const [reviewReport, { isLoading: isReviewing }] = useReviewReportMutation();

  const reports = reportsData?.reports || [];
  const totalReports = reportsData?.total || 0;
  const totalPages = reportsData?.totalPages || 1;

  const filteredReports = useMemo(() => {
    if (!search.trim()) return reports;
    const q = search.toLowerCase();
    return reports.filter((r) => {
      const cName = r.company?.name || "";
      const iName = r.productionItem?.name || "";
      const notes = r.notes || "";
      return (
        cName.toLowerCase().includes(q) ||
        iName.toLowerCase().includes(q) ||
        notes.toLowerCase().includes(q)
      );
    });
  }, [reports, search]);

  // Aggregate KPI stats across fetched dataset
  const kpis = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const r of reports) {
      if (r.status === "submitted") pending++;
      else if (r.status === "approved") approved++;
      else if (r.status === "rejected") rejected++;
    }
    return { pending, approved, rejected, total: totalReports };
  }, [reports, totalReports]);

  const handleOpenReview = (report: CompanyProductionReport, defaultAction: "approved" | "rejected" = "approved") => {
    setActiveReport(report);
    setReviewAction(defaultAction);
    setReviewComments(report.review_comments || "");
    setReviewError("");
    setIsReviewModalOpen(true);
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReport) return;

    try {
      setReviewError("");
      await reviewReport({
        id: activeReport.report_id,
        action: reviewAction,
        review_comments: reviewComments.trim() || undefined,
      }).unwrap();

      setIsReviewModalOpen(false);
      setActiveReport(null);
      refetch();
    } catch (err: any) {
      setReviewError(err?.data?.message || err?.message || "Failed to submit review action.");
    }
  };

  const columns: ColumnDef<CompanyProductionReport>[] = [
    {
      accessorKey: "report_date",
      header: "Report Date",
      cell: ({ row }) => (
        <span className="font-mono font-medium text-xs whitespace-nowrap">
          {row.original.report_date}
        </span>
      ),
    },
    {
      id: "company",
      header: "Company",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-xs text-foreground">
            {row.original.company?.name || "Unknown Company"}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {row.original.company?.code}
          </span>
        </div>
      ),
    },
    {
      id: "item",
      header: "Production Commodity",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-xs text-foreground">
            {row.original.productionItem?.name || "Commodity"}
          </span>
          <span className="text-[10px] text-muted-foreground capitalize">
            {row.original.productionItem?.category}
          </span>
        </div>
      ),
    },
    {
      id: "quantity_reported",
      header: "Reported Volume",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-mono font-bold text-xs text-foreground">
            {Number(row.original.quantity_reported).toLocaleString()}{" "}
            {row.original.reportedUnit?.symbol || ""}
          </span>
          {row.original.normalized_quantity && (
            <span className="text-[10px] font-mono text-muted-foreground">
              {Number(row.original.normalized_quantity).toLocaleString()}{" "}
              {row.original.productionItem?.baseUnit?.symbol || "base"}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "period_label",
      header: "Reporting Period",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.period_label || "Daily Record"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Audit Status",
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <Badge
            variant={
              s === "approved"
                ? "default"
                : s === "rejected"
                ? "destructive"
                : "secondary"
            }
            className="capitalize text-[10px] font-semibold"
          >
            {s === "submitted" ? "Pending Review" : s}
          </Badge>
        );
      },
    },
    {
      id: "notes",
      header: "Remarks & Observations",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]" title={row.original.notes || ""}>
          {row.original.notes || "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const r = row.original;
        const isPending = r.status === "submitted";
        return (
          <div className="flex items-center justify-end gap-1.5">
            {isPending ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenReview(r, "approved")}
                className="h-7 text-xs border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 gap-1"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                Review
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenReview(r, r.status === "rejected" ? "rejected" : "approved")}
                className="h-7 text-xs gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                Inspect
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return <Loading01 />;
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-white/20 p-2 backdrop-blur-sm">
                <ClipboardCheck className="h-6 w-6 text-white" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight">
                National Production Reports Register
              </h1>
            </div>
            <p className="mt-1 text-sm text-teal-100">
              Audit, reconcile, and approve daily and scheduled mineral production logs submitted by mining companies.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-white/30 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center gap-2 shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Reports</span>
            <Building2 className="h-4 w-4 text-teal-600" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {kpis.total.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Logged across all operations</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Pending Approval</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-amber-600">
            {kpis.pending.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Awaiting ministry inspection</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Approved</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">
            {kpis.approved.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Reconciled production logs</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Rejected / Revisions</span>
            <XCircle className="h-4 w-4 text-destructive" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-destructive">
            {kpis.rejected.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Flagged discrepancies</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Filter className="h-3.5 w-3.5" />
          <span>Filter Submissions</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Company</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => {
                setSelectedCompanyId(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Companies</option>
              {companies.map((c) => (
                <option key={c.company_id} value={c.company_id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Production Item</label>
            <select
              value={selectedItemId}
              onChange={(e) => {
                setSelectedItemId(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Items</option>
              {items.map((it) => (
                <option key={it.production_item_id} value={it.production_item_id}>
                  {it.name} ({it.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Audit Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">From Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">To Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="h-9 text-xs"
            />
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search company, item, or remarks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            {(selectedCompanyId !== "all" ||
              selectedItemId !== "all" ||
              selectedStatus !== "all" ||
              startDate ||
              endDate ||
              search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCompanyId("all");
                  setSelectedItemId("all");
                  setSelectedStatus("all");
                  setStartDate("");
                  setEndDate("");
                  setSearch("");
                  setPage(1);
                }}
                className="h-8 text-xs text-muted-foreground"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Reports Data Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredReports}
          isLoading={isLoading || isFetching}
        />

        {/* Pagination Controls */}
        <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {filteredReports.length} of {totalReports} entries
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 text-xs"
            >
              Previous
            </Button>
            <span className="font-medium text-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isFetching}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Audit / Review Modal */}
      {isReviewModalOpen && activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Production Report Audit & Inspection
                </h3>
                <p className="text-xs text-muted-foreground">
                  Reconciliation for {activeReport.company?.name} • {activeReport.report_date}
                </p>
              </div>
              <Badge
                variant={
                  activeReport.status === "approved"
                    ? "default"
                    : activeReport.status === "rejected"
                    ? "destructive"
                    : "secondary"
                }
                className="capitalize text-xs"
              >
                {activeReport.status}
              </Badge>
            </div>

            {reviewError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            {/* Report Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-3.5 rounded-xl border border-border/50">
              <div>
                <span className="text-muted-foreground block">Enterprise</span>
                <span className="font-semibold text-foreground">
                  {activeReport.company?.name} ({activeReport.company?.code})
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block">Commodity</span>
                <span className="font-semibold text-foreground">
                  {activeReport.productionItem?.name} ({activeReport.productionItem?.category})
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block">Reported Quantity</span>
                <span className="font-bold text-foreground font-mono">
                  {Number(activeReport.quantity_reported).toLocaleString()}{" "}
                  {activeReport.reportedUnit?.symbol}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block">Normalized Base</span>
                <span className="font-mono text-foreground">
                  {Number(activeReport.normalized_quantity).toLocaleString()}{" "}
                  {activeReport.productionItem?.baseUnit?.symbol || "base"}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block">Period / Shift</span>
                <span className="text-foreground">{activeReport.period_label || "Daily Record"}</span>
              </div>

              <div>
                <span className="text-muted-foreground block">Report Date</span>
                <span className="font-mono text-foreground">{activeReport.report_date}</span>
              </div>

              {activeReport.notes && (
                <div className="col-span-2 pt-1 border-t border-border/40">
                  <span className="text-muted-foreground block">Company Remarks</span>
                  <p className="text-foreground italic mt-0.5">{activeReport.notes}</p>
                </div>
              )}
            </div>

            {/* Review Form */}
            <form onSubmit={handleSaveReview} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Review Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={reviewAction === "approved" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setReviewAction("approved")}
                    className={`h-9 text-xs font-semibold ${
                      reviewAction === "approved" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Approve Report
                  </Button>
                  <Button
                    type="button"
                    variant={reviewAction === "rejected" ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setReviewAction("rejected")}
                    className="h-9 text-xs font-semibold"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1.5" />
                    Reject / Flag
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Audit Notes / Instructions to Enterprise
                </label>
                <textarea
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="Provide feedback, reconciliation confirmation, or reason for revision..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsReviewModalOpen(false);
                    setActiveReport(null);
                  }}
                  className="h-8 text-xs"
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isReviewing}
                  className={`h-8 text-xs ${
                    reviewAction === "approved"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  }`}
                >
                  {isReviewing ? "Saving..." : `Confirm ${reviewAction === "approved" ? "Approval" : "Rejection"}`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
