"use client";

import React, { useState } from "react";
import {
  useGetNationalRequirementsQuery,
  useCreateNationalRequirementMutation,
  useUpdateNationalRequirementMutation,
  useDeleteNationalRequirementMutation,
  useAssignRequirementToRegionsMutation,
  useGetNationalUnitsCatalogQuery,
} from "@/redux/api/nationalReportingApi";
import { useGetRegionsQuery } from "@/redux/api/regionApi";
import { NationalReportingRequirement } from "@/redux/types/nationalReporting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Plus,
  Search,
  Edit,
  Trash2,
  Share2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "mining_production", label: "Mining Production" },
  { value: "mineral_exploration", label: "Mineral Exploration" },
  { value: "industrial_capacity", label: "Industrial Capacity" },
  { value: "revenue_generation", label: "Revenue & Royalty Generation" },
  { value: "environmental_compliance", label: "Environmental & Community Compliance" },
];

export function NationalRequirementsTab() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<NationalReportingRequirement | null>(null);
  const [assigningReq, setAssigningReq] = useState<NationalReportingRequirement | null>(null);

  // Queries
  const { data: requirements = [], isLoading } = useGetNationalRequirementsQuery({
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    search: search ? search : undefined,
  });

  const { data: unitsCatalog = {} } = useGetNationalUnitsCatalogQuery();
  const { data: regions = [] } = useGetRegionsQuery({ is_active: true });

  // Mutations
  const [createRequirement, { isLoading: isCreating }] = useCreateNationalRequirementMutation();
  const [updateRequirement, { isLoading: isUpdating }] = useUpdateNationalRequirementMutation();
  const [deleteRequirement] = useDeleteNationalRequirementMutation();
  const [assignToRegions, { isLoading: isAssigning }] = useAssignRequirementToRegionsMutation();

  // Form State for Create / Edit
  const [formData, setFormData] = useState({
    code: "",
    title: "",
    description: "",
    category: "mining_production",
    unit_category: "mass",
    expected_unit: "kg",
    frequency: "quarterly",
    requires_numeric: true,
    requires_narrative: false,
    requires_evidence: false,
    effective_start_date: "",
    effective_end_date: "",
    is_active: true,
  });

  // Assign Form State
  const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>([]);
  const [isMandatory, setIsMandatory] = useState(true);
  const [assignNotes, setAssignNotes] = useState("");

  const handleOpenCreate = () => {
    setFormData({
      code: "",
      title: "",
      description: "",
      category: "mining_production",
      unit_category: "mass",
      expected_unit: "kg",
      frequency: "quarterly",
      requires_numeric: true,
      requires_narrative: false,
      requires_evidence: false,
      effective_start_date: "",
      effective_end_date: "",
      is_active: true,
    });
    setEditingReq(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (req: NationalReportingRequirement) => {
    setEditingReq(req);
    setFormData({
      code: req.code,
      title: req.title,
      description: req.description || "",
      category: req.category,
      unit_category: req.unit_category || "mass",
      expected_unit: req.expected_unit,
      frequency: req.frequency,
      requires_numeric: req.requires_numeric,
      requires_narrative: req.requires_narrative,
      requires_evidence: req.requires_evidence,
      effective_start_date: req.effective_start_date || "",
      effective_end_date: req.effective_end_date || "",
      is_active: req.is_active,
    });
    setIsCreateOpen(true);
  };

  const handleSaveRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.title.trim()) {
      toast.error("Code and Title are required");
      return;
    }

    const payload = {
      ...formData,
      code: formData.code.trim().toUpperCase(),
      title: formData.title.trim(),
      description: formData.description?.trim() || null,
      expected_unit: formData.expected_unit?.trim(),
      effective_start_date: formData.effective_start_date ? formData.effective_start_date : null,
      effective_end_date: formData.effective_end_date ? formData.effective_end_date : null,
    };

    try {
      if (editingReq) {
        await updateRequirement({
          id: editingReq.requirement_id,
          data: payload,
        }).unwrap();
        toast.success("National requirement updated successfully");
      } else {
        await createRequirement(payload).unwrap();
        toast.success("National requirement created successfully");
      }
      setIsCreateOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to save requirement");
    }
  };

  const handleDelete = async (req: NationalReportingRequirement) => {
    if (!confirm(`Are you sure you want to delete requirement '${req.code}'?`)) return;
    try {
      const res = await deleteRequirement(req.requirement_id).unwrap();
      toast.success(res?.message || "Requirement deleted");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to delete requirement");
    }
  };

  const handleOpenAssign = (req: NationalReportingRequirement) => {
    setAssigningReq(req);
    const existingIds = req.assignments?.map((a) => a.region_id) || [];
    setSelectedRegionIds(existingIds);
    setIsMandatory(true);
    setAssignNotes("");
  };

  const handleSaveAssignment = async () => {
    if (!assigningReq) return;
    if (selectedRegionIds.length === 0) {
      toast.error("Please select at least one regional state");
      return;
    }

    try {
      await assignToRegions({
        requirementId: assigningReq.requirement_id,
        regionIds: selectedRegionIds,
        isMandatory,
        notes: assignNotes,
      }).unwrap();
      toast.success("Requirement assigned to regional states successfully");
      setAssigningReq(null);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to assign requirement");
    }
  };

  const availableUnits =
    unitsCatalog[formData.unit_category]?.units || [formData.expected_unit];

  return (
    <div className="space-y-6">
      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search code, title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px] bg-slate-50 dark:bg-slate-950">
              <Filter className="h-4 w-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Requirement
        </Button>
      </div>

      {/* Requirements Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Code & Title</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Expected Unit</th>
                <th className="px-5 py-3.5">Frequency</th>
                <th className="px-5 py-3.5">Assigned Regions</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    Loading national requirements...
                  </td>
                </tr>
              ) : requirements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    No national reporting requirements defined yet.
                  </td>
                </tr>
              ) : (
                requirements.map((req) => (
                  <tr
                    key={req.requirement_id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {req.title}
                      </div>
                      <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {req.code}
                      </div>
                      {req.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-1">
                          {req.description}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="outline" className="capitalize text-xs bg-slate-100 dark:bg-slate-800">
                        {req.category.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-300">
                      <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">
                        {req.expected_unit}
                      </span>
                      <span className="text-xs text-slate-400 ml-1.5">
                        ({req.unit_category})
                      </span>
                    </td>
                    <td className="px-5 py-4 capitalize text-slate-600 dark:text-slate-400">
                      {req.frequency}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant={req.assignedRegionsCount ? "default" : "secondary"}
                        className={
                          req.assignedRegionsCount
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200"
                            : "bg-slate-100 text-slate-600"
                        }
                      >
                        {req.assignedRegionsCount || 0} Regions
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      {req.is_active ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-slate-500">
                          Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenAssign(req)}
                          title="Assign to Regions"
                          className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                        >
                          <Share2 className="h-4 w-4 mr-1" />
                          Assign
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(req)}
                          title="Edit Requirement"
                          className="h-8 w-8 text-slate-600 hover:text-slate-900"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(req)}
                          title="Delete Requirement"
                          className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Requirement Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReq ? `Edit National Requirement: ${editingReq.code}` : "Create National Reporting Requirement"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveRequirement} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="req-code">Requirement Code *</Label>
                <Input
                  id="req-code"
                  placeholder="e.g. NAT-REQ-GOLD-01"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="req-category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger id="req-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="req-title">Indicator Title *</Label>
              <Input
                id="req-title"
                placeholder="e.g. Total Artisanal Gold Production Purchased"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="req-desc">Description & Instructions</Label>
              <Textarea
                id="req-desc"
                placeholder="Clear definitions and measurement guidelines for regional reporting officers..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="req-unit-cat">Measurement Category *</Label>
                <Select
                  value={formData.unit_category}
                  onValueChange={(cat) => {
                    const defaultUnit = unitsCatalog[cat]?.base || "count";
                    setFormData({ ...formData, unit_category: cat, expected_unit: defaultUnit });
                  }}
                >
                  <SelectTrigger id="req-unit-cat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mass">Mass / Weight</SelectItem>
                    <SelectItem value="volume">Volume</SelectItem>
                    <SelectItem value="count">Count / Quantity</SelectItem>
                    <SelectItem value="area">Area</SelectItem>
                    <SelectItem value="currency">Currency / Value</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="req-unit">Expected National Unit *</Label>
                <Select
                  value={formData.expected_unit}
                  onValueChange={(u) => setFormData({ ...formData, expected_unit: u })}
                >
                  <SelectTrigger id="req-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUnits.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="req-freq">Reporting Frequency *</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(f) => setFormData({ ...formData, frequency: f })}
                >
                  <SelectTrigger id="req-freq">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="semi_annually">Semi-Annually</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Validation & Evidence Options */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-3 bg-slate-50 dark:bg-slate-950">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Reporting Rules & Constraints
              </span>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="num-req" className="text-sm">
                    Requires Numeric Value
                  </Label>
                  <Switch
                    id="num-req"
                    checked={formData.requires_numeric}
                    onCheckedChange={(val) => setFormData({ ...formData, requires_numeric: val })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="narr-req" className="text-sm">
                    Requires Narrative
                  </Label>
                  <Switch
                    id="narr-req"
                    checked={formData.requires_narrative}
                    onCheckedChange={(val) => setFormData({ ...formData, requires_narrative: val })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="ev-req" className="text-sm">
                    Requires Evidence
                  </Label>
                  <Switch
                    id="ev-req"
                    checked={formData.requires_evidence}
                    onCheckedChange={(val) => setFormData({ ...formData, requires_evidence: val })}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="req-active"
                  checked={formData.is_active}
                  onCheckedChange={(val) => setFormData({ ...formData, is_active: val })}
                />
                <Label htmlFor="req-active">Active Indicator</Label>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || isUpdating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isCreating || isUpdating ? "Saving..." : "Save Requirement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Regional Assignment Modal */}
      <Dialog open={!!assigningReq} onOpenChange={() => setAssigningReq(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Assign Requirement to Regional States</DialogTitle>
          </DialogHeader>

          {assigningReq && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
                  {assigningReq.code}
                </div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {assigningReq.title}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Expected unit: <span className="font-semibold">{assigningReq.expected_unit}</span> | Frequency: <span className="capitalize">{assigningReq.frequency}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Select Regional States *</Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="text-xs p-0 h-auto text-emerald-600"
                    onClick={() => {
                      if (selectedRegionIds.length === regions.length) {
                        setSelectedRegionIds([]);
                      } else {
                        setSelectedRegionIds(regions.map((r) => r.region_id));
                      }
                    }}
                  >
                    {selectedRegionIds.length === regions.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950">
                  {regions.map((region) => {
                    const isChecked = selectedRegionIds.includes(region.region_id);
                    return (
                      <label
                        key={region.region_id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm transition-colors border ${
                          isChecked
                            ? "bg-emerald-100/60 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 font-medium text-emerald-900 dark:text-emerald-100"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRegionIds([...selectedRegionIds, region.region_id]);
                            } else {
                              setSelectedRegionIds(
                                selectedRegionIds.filter((id) => id !== region.region_id)
                              );
                            }
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{region.name}</span>
                        {region.code && (
                          <span className="text-xs text-slate-400 font-mono">
                            ({region.code})
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="mand-toggle">Mandatory Reporting</Label>
                  <p className="text-xs text-slate-500">
                    Mandatory indicators flag incomplete national data when missing
                  </p>
                </div>
                <Switch
                  id="mand-toggle"
                  checked={isMandatory}
                  onCheckedChange={setIsMandatory}
                />
              </div>

              <div>
                <Label htmlFor="assign-notes">Assignment Directives / Notes</Label>
                <Textarea
                  id="assign-notes"
                  placeholder="Specific regional reporting guidelines or target focus..."
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAssigningReq(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isAssigning || selectedRegionIds.length === 0}
                  onClick={handleSaveAssignment}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isAssigning ? "Assigning..." : `Assign to ${selectedRegionIds.length} Regions`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

