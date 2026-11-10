"use client";

import React, { useMemo, useState } from "react";
import {
  useGetNationalAssignmentsQuery,
  useUpdateNationalAssignmentMutation,
} from "@/redux/api/nationalReportingApi";
import { useGetRegionsQuery } from "@/redux/api/regionApi";
import { NationalReportingAssignment } from "@/redux/types/nationalReporting";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import type { FilterField, ActionButton } from "@/types/tableLayout";
import { useSearchParams } from "next/navigation";
import { matchesSearchQuery } from "@/utils/tableUtils";
import { RegionalReportingMethodConfigModal } from "./RegionalReportingMethodConfigModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Edit,
  CheckCircle,
  Settings,
  Layers,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

export function RegionalAssignmentsTab() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const [regionFilter, setRegionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mandatoryFilter, setMandatoryFilter] = useState("all");

  const [editingAssignment, setEditingAssignment] = useState<NationalReportingAssignment | null>(null);
  const [statusDraft, setStatusDraft] = useState<"active" | "suspended" | "withdrawn">("active");
  const [isMandatoryDraft, setIsMandatoryDraft] = useState(true);
  const [notesDraft, setNotesDraft] = useState("");
  const [configuringRegion, setConfiguringRegion] = useState<{
    regionId: string;
    regionName: string;
    regionCode?: string;
  } | null>(null);

  const {
    data: assignments = [],
    isLoading,
    isError,
    refetch,
  } = useGetNationalAssignmentsQuery({});

  const { data: regions = [] } = useGetRegionsQuery({ is_active: true });
  const [updateAssignment, { isLoading: isUpdating }] = useUpdateNationalAssignmentMutation();

  const handleOpenEdit = (a: NationalReportingAssignment) => {
    setEditingAssignment(a);
    setStatusDraft(a.status);
    setIsMandatoryDraft(a.is_mandatory);
    setNotesDraft(a.notes || "");
  };

  const handleSaveEdit = async () => {
    if (!editingAssignment) return;
    try {
      await updateAssignment({
        assignmentId: editingAssignment.assignment_id,
        data: {
          status: statusDraft,
          is_mandatory: isMandatoryDraft,
          notes: notesDraft,
        },
      }).unwrap();
      toast.success("Assignment updated successfully");
      setEditingAssignment(null);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update assignment");
    }
  };

  // Filtered dataset
  const filteredData = useMemo(() => {
    return assignments.filter((a) => {
      if (regionFilter !== "all" && a.region_id !== regionFilter) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (mandatoryFilter === "mandatory" && !a.is_mandatory) return false;
      if (mandatoryFilter === "optional" && a.is_mandatory) return false;

      return matchesSearchQuery(searchQuery, [
        a.region?.name,
        a.region?.code,
        a.requirement?.code,
        a.requirement?.title,
        a.requirement?.category,
        a.requirement?.expected_unit,
      ]);
    });
  }, [assignments, regionFilter, statusFilter, mandatoryFilter, searchQuery]);

  // Columns definition
  const columns: ColumnDef<NationalReportingAssignment>[] = [
    {
      id: "region",
      header: "Regional State & Method",
      cell: ({ row }) => {
        const a = row.original;
        const isFormEffective = a.region?.national_reporting_method !== "node_mapping";

        return (
          <div className="space-y-1">
            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>{a.region?.name || "Unknown Region"}</span>
              {a.region?.code && (
                <span className="text-xs font-mono text-slate-400">
                  [{a.region.code}]
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {isFormEffective ? (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-medium flex items-center gap-1">
                  <FileText className="h-2.5 w-2.5" />
                  Form-Based (Active)
                </Badge>
              ) : (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-medium flex items-center gap-1">
                  <Layers className="h-2.5 w-2.5" />
                  Node Mapping (Active)
                </Badge>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "requirement",
      header: "National Requirement",
      cell: ({ row }) => {
        const req = row.original.requirement;
        return (
          <div className="space-y-0.5 max-w-sm">
            <div className="font-medium text-slate-800 dark:text-slate-200 text-xs">
              {req?.title}
            </div>
            <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
              {req?.code} • {req?.expected_unit}
            </div>
          </div>
        );
      },
    },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs capitalize bg-slate-50 dark:bg-slate-900">
          {row.original.requirement?.category?.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "is_mandatory",
      header: "Requirement",
      cell: ({ row }) =>
        row.original.is_mandatory ? (
          <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-xs">
            Mandatory
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">
            Optional
          </Badge>
        ),
    },
    {
      id: "mapping_status",
      header: "Mapping / Node Status",
      cell: ({ row }) => {
        const a = row.original;
        const hasMappings = a.mappings && a.mappings.length > 0;
        const isConfirmed = hasMappings && a.mappings!.some((m) => m.stage === "confirmed");

        if (isConfirmed) {
          return (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 flex items-center gap-1 w-fit text-xs">
              <CheckCircle className="h-3 w-3" />
              Confirmed (Stage B)
            </Badge>
          );
        }
        if (hasMappings) {
          return (
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 text-xs">
              Potential (Stage A)
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="text-slate-400 border-dashed text-xs">
            Unmapped
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status;
        if (s === "active") {
          return (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs">
              Active
            </Badge>
          );
        }
        if (s === "suspended") {
          return (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">
              Suspended
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="text-rose-600 border-rose-200 text-xs">
            Withdrawn
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const a = row.original;
        return (
          <div className="flex items-center justify-end gap-1.5">
            {a.region && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setConfiguringRegion({
                    regionId: a.region!.region_id,
                    regionName: a.region!.name,
                    regionCode: a.region!.code,
                  })
                }
                className="text-xs h-8 px-2 border-slate-300 text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1"
                title="Configure Regional Reporting Method (Form vs Node Mapping)"
              >
                <Settings className="h-3.5 w-3.5 text-slate-500" />
                Configure Method
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenEdit(a)}
              className="h-8 w-8 text-slate-600 hover:text-slate-900"
              title="Edit Assignment Rules"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  // Filters for TableLayout
  const filters: FilterField[] = [
    {
      key: "region",
      label: "Regional State",
      type: "select",
      placeholder: "All Regional States",
      value: regionFilter,
      onChange: setRegionFilter,
      options: [
        { label: "All Regional States", value: "all" },
        ...regions.map((r) => ({ label: r.name, value: r.region_id })),
      ],
    },
    {
      key: "status",
      label: "Assignment Status",
      type: "select",
      placeholder: "All Statuses",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { label: "All Statuses", value: "all" },
        { label: "Active", value: "active" },
        { label: "Suspended", value: "suspended" },
        { label: "Withdrawn", value: "withdrawn" },
      ],
    },
    {
      key: "mandatory",
      label: "Requirement Type",
      type: "select",
      placeholder: "All Types",
      value: mandatoryFilter,
      onChange: setMandatoryFilter,
      options: [
        { label: "All Types", value: "all" },
        { label: "Mandatory Only", value: "mandatory" },
        { label: "Optional Only", value: "optional" },
      ],
    },
  ];

  return (
    <>
      <TableLayout
        title="Regional Assignments & Reporting Permissions"
        filters={filters}
        filterColumnsPerRow={3}
      >
        <DataTable
          columns={columns}
          data={filteredData}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load regional assignments."
          onRetry={refetch}
          resetKey={`${searchQuery}-${regionFilter}-${statusFilter}-${mandatoryFilter}`}
        />
      </TableLayout>

      {/* Edit Assignment Dialog */}
      <Dialog open={!!editingAssignment} onOpenChange={() => setEditingAssignment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Regional Assignment</DialogTitle>
          </DialogHeader>

          {editingAssignment && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-1">
                <div>
                  Region: <span className="font-semibold">{editingAssignment.region?.name}</span>
                </div>
                <div>
                  Requirement: <span className="font-semibold">{editingAssignment.requirement?.title}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-status">Assignment Status</Label>
                <Select
                  value={statusDraft}
                  onValueChange={(val: any) => setStatusDraft(val)}
                >
                  <SelectTrigger id="edit-status" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3">
                <Label htmlFor="edit-mandatory" className="text-sm font-semibold">
                  Mandatory Reporting
                </Label>
                <Switch
                  id="edit-mandatory"
                  checked={isMandatoryDraft}
                  onCheckedChange={setIsMandatoryDraft}
                />
              </div>

              <div>
                <Label htmlFor="edit-notes">Notes / Instructions</Label>
                <Textarea
                  id="edit-notes"
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setEditingAssignment(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={isUpdating}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Regional Reporting Method Config Modal */}
      {configuringRegion && (
        <RegionalReportingMethodConfigModal
          isOpen={!!configuringRegion}
          onClose={() => setConfiguringRegion(null)}
          regionId={configuringRegion.regionId}
          regionName={configuringRegion.regionName}
          regionCode={configuringRegion.regionCode}
        />
      )}
    </>
  );
}
