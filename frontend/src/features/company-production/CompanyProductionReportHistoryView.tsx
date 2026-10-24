"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Edit2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import type { ActionButton, FilterField } from "@/types/tableLayout";
import { CompanyProductionTabsHeader } from "./CompanyProductionTabsHeader";
import {
  useGetReportsQuery,
  useGetAssignmentsQuery,
  useUpdateReportMutation,
} from "@/redux/api/productionApi";
import type { CompanyProductionReport } from "@/redux/types/production";

export function CompanyProductionReportHistoryView({ companyId: propCompanyId }: { companyId?: string }) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const companyId = propCompanyId || params?.id || session?.user?.company_id;
  const initialItemId = searchParams.get("item_id") || "all";

  // Filter States
  const [selectedItemId, setSelectedItemId] = useState<string>(initialItemId);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(15);

  const { data: assignments = [] } = useGetAssignmentsQuery(
    { company_id: companyId as string, is_active: true },
    { skip: !companyId }
  );

  const {
    data: reportsData,
    isLoading,
    isError,
    refetch,
  } = useGetReportsQuery(
    {
      company_id: companyId as string,
      production_item_id: selectedItemId === "all" ? undefined : selectedItemId,
      status: selectedStatus === "all" ? undefined : selectedStatus,
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
      refetch();
    } catch (err: any) {
      setEditError(err?.data?.message || err?.message || "Failed to update production report.");
    }
  };

  const columns: ColumnDef<CompanyProductionReport>[] = [
    {
      accessorKey: "report_date",
      header: "Date",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium text-foreground">
          {row.original.report_date}
        </span>
      ),
    },
    {
      id: "productionItem",
      header: "Production Item",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-foreground">
            {row.original.productionItem?.name || "N/A"}
          </div>
          <div className="text-[11px] font-mono text-muted-foreground">
            {row.original.productionItem?.code}
          </div>
        </div>
      ),
    },
    {
      id: "quantity_reported",
      header: "Reported Quantity",
      cell: ({ row }) => (
        <div className="font-bold text-foreground">
          {Number(row.original.quantity_reported).toLocaleString()}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            {row.original.reportedUnit?.symbol || row.original.reportedUnit?.code}
          </span>
        </div>
      ),
    },
    {
      id: "normalized_quantity",
      header: "Normalized Base Quantity",
      cell: ({ row }) => (
        <div className="font-mono text-xs text-muted-foreground">
          {Number(row.original.normalized_quantity).toLocaleString()}{" "}
          <span>
            {row.original.productionItem?.baseUnit?.symbol ||
              (row.original.productionItem as any)?.base_unit?.symbol ||
              "base"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <Badge
            variant={
              s === "approved"
                ? "default"
                : s === "submitted"
                ? "secondary"
                : s === "rejected"
                ? "destructive"
                : "outline"
            }
            className="capitalize text-xs font-semibold"
          >
            {s}
          </Badge>
        );
      },
    },
    {
      id: "submittedBy",
      header: "Submitted By",
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground">
          <div>{row.original.submittedByUser?.full_name || "Self-Reported"}</div>
          <div className="text-[10px] opacity-70">
            {row.original.created_at ? new Date(row.original.created_at).toLocaleDateString() : ""}
          </div>
        </div>
      ),
    },
    {
      id: "reviewInfo",
      header: "Review Info",
      cell: ({ row }) => {
        const report = row.original;
        if (report.status === "approved") {
          return (
            <div className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-xs font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Approved</span>
            </div>
          );
        }
        if (report.status === "rejected") {
          return (
            <div className="text-destructive space-y-0.5 text-xs">
              <div className="flex items-center gap-1 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Rejected</span>
              </div>
              {report.review_comments && (
                <div className="text-[10px] text-muted-foreground italic">
                  &quot;{report.review_comments}&quot;
                </div>
              )}
            </div>
          );
        }
        return (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Clock className="h-3.5 w-3.5" />
            Pending Review
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const report = row.original;
        if (report.status === "approved") return null;
        return (
          <div className="text-right">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenEdit(report)}
              className="h-8 px-2 gap-1 text-xs"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        );
      },
    },
  ];

  const filters: FilterField[] = [
    {
      key: "status",
      label: "Review Status",
      type: "select",
      placeholder: "All Statuses",
      value: selectedStatus,
      onChange: (val: string) => {
        setSelectedStatus(val);
        setPage(1);
      },
      options: [
        { label: "All Statuses", value: "all" },
        { label: "Submitted", value: "submitted" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
        { label: "Draft", value: "draft" },
      ],
    },
    ...(assignments.length > 0
      ? [
          {
            key: "item",
            label: "Production Item",
            type: "select" as const,
            placeholder: "All Items",
            value: selectedItemId,
            onChange: (val: string) => {
              setSelectedItemId(val);
              setPage(1);
            },
            options: [
              { label: "All Items", value: "all" },
              ...assignments.map((a) => ({
                label: `${a.productionItem?.name} (${a.productionItem?.code})`,
                value: a.production_item_id,
              })),
            ],
          },
        ]
      : []),
  ];

  const actions: ActionButton[] = [
    {
      label: "Submit New Report",
      icon: <Plus className="h-4 w-4" />,
      variant: "default",
      onClick: () => router.push(`/companies/${companyId}/production/submit`),
    },
  ];

  return (
    <div className="space-y-6">
      <CompanyProductionTabsHeader companyId={companyId} />

      <TableLayout
        title="Production Report History & Audit"
        description="Complete audit trail of submitted daily production records, unit normalizations, and review status."
        actions={actions}
        filters={filters}
        filterColumnsPerRow={assignments.length > 0 ? 2 : 1}
      >
        <DataTable
          columns={columns}
          data={reports}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load production reports."
          onRetry={refetch}
          paginationMode="server"
          totalRowCount={totalReports}
          pageIndex={page - 1}
          pageSize={limit}
          onPaginationChange={(newPageIndex, newPageSize) => {
            setPage(newPageIndex + 1);
            if (newPageSize !== limit) {
              setLimit(newPageSize);
            }
          }}
          resetKey={`${selectedItemId}-${selectedStatus}`}
        />
      </TableLayout>

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
