"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import {
  Factory,
  ClipboardList,
  Filter,
  Search,
  Plus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Edit2,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  Scale,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { CompanyProductionTabsHeader } from "./CompanyProductionTabsHeader";
import {
  useGetReportsQuery,
  useGetAssignmentsQuery,
  useUpdateReportMutation,
} from "@/redux/api/productionApi";
import type { CompanyProductionReport, CompanyProductionAssignment } from "@/redux/types/production";

export function CompanyProductionReportHistoryView({ companyId: propCompanyId }: { companyId?: string }) {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const companyId = propCompanyId || params?.id || session?.user?.company_id;
  const initialItemId = searchParams.get("item_id") || "all";

  // Filter States
  const [selectedItemId, setSelectedItemId] = useState<string>(initialItemId);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const limit = 15;

  const { data: assignments = [] } = useGetAssignmentsQuery(
    { company_id: companyId as string, is_active: true },
    { skip: !companyId }
  );

  const {
    data: reportsData,
    isLoading,
    isFetching,
    refetch,
  } = useGetReportsQuery(
    {
      company_id: companyId as string,
      production_item_id: selectedItemId === "all" ? undefined : selectedItemId,
      status: selectedStatus === "all" ? undefined : selectedStatus,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      page,
      limit,
    },
    { skip: !companyId }
  );

  const [updateReport, { isLoading: isUpdating }] = useUpdateReportMutation();

  // Edit / Details Modal State
  const [selectedReport, setSelectedReport] = useState<CompanyProductionReport | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editQuantity, setEditQuantity] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [editError, setEditError] = useState<string>("");

  if (isLoading) {
    return <Loading01 />;
  }

  if (!companyId) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-3" />
        <h2 className="text-xl font-bold">Unauthorized Company Context</h2>
        <p className="text-sm text-muted-foreground mt-1">
          No company context was identified for your active session.
        </p>
      </div>
    );
  }

  const reports = reportsData?.reports || [];
  const totalReports = reportsData?.total || 0;
  const totalPages = reportsData?.totalPages || 1;

  const handleOpenEdit = (report: CompanyProductionReport) => {
    setSelectedReport(report);
    setEditQuantity(String(report.quantity_reported));
    setEditNotes(report.notes || "");
    setEditError("");
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    const numQty = parseFloat(editQuantity);
    if (isNaN(numQty) || numQty <= 0) {
      setEditError("Please enter a valid positive quantity.");
      return;
    }

    try {
      await updateReport({
        id: selectedReport.report_id,
        data: {
          quantity_reported: numQty,
          notes: editNotes || null,
        },
      }).unwrap();

      setIsEditModalOpen(false);
      setSelectedReport(null);
    } catch (err: any) {
      setEditError(err?.data?.message || err?.message || "Failed to update production report.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <ClipboardList className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Production Report History & Audit
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Complete audit trail of submitted daily production records, unit normalizations, and review status.
          </p>
        </div>

        <Button asChild size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href={`/companies/${companyId}/production/submit`}>
            <Plus className="h-4 w-4" />
            Submit New Report
          </Link>
        </Button>
      </div>

      <CompanyProductionTabsHeader companyId={companyId} />

      {/* Filter Toolbar */}
      <div className="bg-card p-5 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Filter className="h-4 w-4 text-primary" />
          Filter Report Records
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Commodity Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Production Item</label>
            <select
              value={selectedItemId}
              onChange={(e) => {
                setSelectedItemId(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Items</option>
              {assignments.map((a) => (
                <option key={a.assignment_id} value={a.production_item_id}>
                  {a.productionItem?.name} ({a.productionItem?.code})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Review Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">From Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">To Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Reports Table Card */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">
            Total Records Found: <span className="text-primary font-mono">{totalReports}</span>
          </span>

          {isFetching && (
            <span className="text-xs text-muted-foreground animate-pulse">
              Updating list...
            </span>
          )}
        </div>

        {reports.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-foreground">No reports found</p>
            <p className="text-xs mt-1">Try adjusting your filters or submit a new daily report.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Production Item</th>
                  <th className="px-4 py-3.5">Reported Quantity</th>
                  <th className="px-4 py-3.5">Normalized Base Quantity</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Submitted By</th>
                  <th className="px-4 py-3.5">Review Info</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reports.map((report) => (
                  <tr key={report.report_id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 font-medium font-mono text-xs text-foreground">
                      {report.report_date}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-medium text-foreground">
                        {report.productionItem?.name || "N/A"}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground">
                        {report.productionItem?.code}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-bold text-foreground">
                      {Number(report.quantity_reported).toLocaleString()}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        {report.reportedUnit?.symbol || report.reportedUnit?.code}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                      {Number(report.normalized_quantity).toLocaleString()}{" "}
                      <span>{report.productionItem?.baseUnit?.symbol || (report.productionItem as any)?.base_unit?.symbol || "base"}</span>
                    </td>

                    <td className="px-4 py-3.5">
                      <Badge
                        variant={
                          report.status === "approved"
                            ? "default"
                            : report.status === "submitted"
                            ? "secondary"
                            : report.status === "rejected"
                            ? "destructive"
                            : "outline"
                        }
                        className="capitalize text-xs font-semibold"
                      >
                        {report.status}
                      </Badge>
                    </td>

                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      <div>{report.submittedByUser?.full_name || "Self-Reported"}</div>
                      <div className="text-[10px] opacity-70">
                        {report.created_at ? new Date(report.created_at).toLocaleDateString() : ""}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-xs">
                      {report.status === "approved" ? (
                        <div className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Approved</span>
                        </div>
                      ) : report.status === "rejected" ? (
                        <div className="text-destructive space-y-0.5">
                          <div className="flex items-center gap-1 font-semibold">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Rejected</span>
                          </div>
                          {report.review_comments && (
                            <div className="text-[10px] text-muted-foreground italic">
                              "{report.review_comments}"
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Pending Review
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {report.status !== "approved" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(report)}
                          className="h-8 px-2 gap-1 text-xs"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 px-3 gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-3 gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Report Modal */}
      {isEditModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-primary" />
                Edit Production Report
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              {editError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
                  {editError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Production Item</label>
                <div className="text-sm font-bold text-foreground">
                  {selectedReport.productionItem?.name} ({selectedReport.productionItem?.code})
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Report Date</label>
                <div className="text-sm font-mono text-foreground">{selectedReport.report_date}</div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Quantity ({selectedReport.reportedUnit?.name})
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  required
                  className="font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Notes / Correction Reason</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Reason for report adjustment..."
                  className="w-full p-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdating}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
