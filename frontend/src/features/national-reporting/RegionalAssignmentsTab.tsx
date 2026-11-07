"use client";

import React, { useState } from "react";
import {
  useGetNationalAssignmentsQuery,
  useUpdateNationalAssignmentMutation,
} from "@/redux/api/nationalReportingApi";
import { useGetRegionsQuery } from "@/redux/api/regionApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, Filter, Globe, Edit, CheckCircle, XCircle, Settings, Layers, FileText } from "lucide-react";
import { toast } from "sonner";
import { NationalReportingAssignment } from "@/redux/types/nationalReporting";
import { RegionalReportingMethodConfigModal } from "./RegionalReportingMethodConfigModal";

export function RegionalAssignmentsTab() {
  const [regionFilter, setRegionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingAssignment, setEditingAssignment] = useState<NationalReportingAssignment | null>(null);
  const [statusDraft, setStatusDraft] = useState<"active" | "suspended" | "withdrawn">("active");
  const [isMandatoryDraft, setIsMandatoryDraft] = useState(true);
  const [notesDraft, setNotesDraft] = useState("");
  const [configuringRegion, setConfiguringRegion] = useState<{
    regionId: string;
    regionName: string;
    regionCode?: string;
  } | null>(null);

  const { data: assignments = [], isLoading } = useGetNationalAssignmentsQuery({
    region_id: regionFilter !== "all" ? regionFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

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

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-slate-400" />
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-[220px] bg-slate-50 dark:bg-slate-950">
              <SelectValue placeholder="All Regional States" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regional States</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.region_id} value={r.region_id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-slate-50 dark:bg-slate-950">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="withdrawn">Withdrawn</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {regionFilter !== "all" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const r = regions.find((x) => x.region_id === regionFilter);
              if (r) {
                setConfiguringRegion({
                  regionId: r.region_id,
                  regionName: r.name,
                  regionCode: r.code,
                });
              }
            }}
            className="text-xs h-9 flex items-center gap-1.5 border-emerald-300 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950"
          >
            <Settings className="h-3.5 w-3.5 text-emerald-600" />
            Reporting Method
          </Button>
        )}

        <div className="ml-auto text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-900 dark:text-slate-100">{assignments.length}</span> active regional assignments
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Regional State</th>
                <th className="px-5 py-3.5">National Requirement</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Mandatory</th>
                <th className="px-5 py-3.5">Mapping Status</th>
                <th className="px-5 py-3.5">Assignment Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    Loading regional assignments...
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    No regional assignments found for the selected filter.
                  </td>
                </tr>
              ) : (
                assignments.map((a) => {
                  const hasMappings = a.mappings && a.mappings.length > 0;
                  const isConfirmed = hasMappings && a.mappings!.some((m) => m.stage === "confirmed");

                  return (
                    <tr
                      key={a.assignment_id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-900 dark:text-slate-100">
                        {a.region?.name || "Unknown Region"}
                        {a.region?.code && (
                          <span className="text-xs font-mono text-slate-400 ml-1.5">
                            [{a.region.code}]
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {a.requirement?.title}
                        </div>
                        <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {a.requirement?.code} • {a.requirement?.expected_unit}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="outline" className="text-xs capitalize">
                          {a.requirement?.category?.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        {a.is_mandatory ? (
                          <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-xs">
                            Mandatory
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Optional
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {isConfirmed ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 flex items-center gap-1 w-fit text-xs">
                            <CheckCircle className="h-3 w-3" />
                            Confirmed (Stage B)
                          </Badge>
                        ) : hasMappings ? (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 text-xs">
                            Potential (Stage A)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-500 border-dashed text-xs">
                            Unmapped
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {a.status === "active" ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            Active
                          </Badge>
                        ) : a.status === "suspended" ? (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                            Suspended
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Withdrawn</Badge>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setConfiguringRegion({
                                regionId: a.region_id,
                                regionName: a.region?.name || "Region",
                                regionCode: a.region?.code,
                              })
                            }
                            className="text-xs text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 h-8 px-2"
                            title="Configure Reporting Method (Option A vs Option B)"
                          >
                            <Settings className="h-3.5 w-3.5 mr-1" />
                            Method
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(a)}
                            className="text-slate-600 hover:text-slate-900 text-xs h-8 px-2"
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            Manage
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Assignment Modal */}
      <Dialog open={!!editingAssignment} onOpenChange={() => setEditingAssignment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Regional Assignment</DialogTitle>
          </DialogHeader>

          {editingAssignment && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                <div className="text-xs font-semibold uppercase text-slate-500">
                  Regional State
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {editingAssignment.region?.name}
                </div>
                <div className="text-xs text-emerald-600 font-mono mt-1">
                  {editingAssignment.requirement?.code} • {editingAssignment.requirement?.title}
                </div>
              </div>

              <div>
                <Label htmlFor="assign-status">Assignment Status</Label>
                <Select
                  value={statusDraft}
                  onValueChange={(val: any) => setStatusDraft(val)}
                >
                  <SelectTrigger id="assign-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="mand-switch">Mandatory Indicator</Label>
                  <p className="text-xs text-slate-500">
                    Require region to publish before period closure
                  </p>
                </div>
                <Switch
                  id="mand-switch"
                  checked={isMandatoryDraft}
                  onCheckedChange={setIsMandatoryDraft}
                />
              </div>

              <div>
                <Label htmlFor="notes-draft">Administrative Directives</Label>
                <Textarea
                  id="notes-draft"
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  rows={3}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingAssignment(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleSaveEdit}
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
    </div>
  );
}

