"use client";

import React, { useMemo, useState } from "react";
import {
  useGetNationalRequirementsQuery,
  useCreateNationalRequirementMutation,
  useUpdateNationalRequirementMutation,
  useDeleteNationalRequirementMutation,
  useAssignRequirementToRegionsMutation,
  useGetNationalUnitsCatalogQuery,
  useGetNationalCategoriesQuery,
} from "@/redux/api/nationalReportingApi";
import { useGetRegionsQuery } from "@/redux/api/regionApi";
import { NationalReportingRequirement } from "@/redux/types/nationalReporting";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import type { FilterField, ActionButton } from "@/types/tableLayout";
import { useSearchParams } from "next/navigation";
import { matchesSearchQuery } from "@/utils/tableUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Plus,
  Edit,
  Trash2,
  Share2,
  Calendar,
  Layers,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import { NationalUnitConfigTab } from "./NationalUnitConfigTab";
import {
  calculateAnnualEndDate,
  validateAnnualDateRange,
  generateReportingPeriods,
} from "@/utils/nationalReportingPeriodUtils";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "mining_production", label: "Mining Production" },
  { value: "mineral_exploration", label: "Mineral Exploration" },
  { value: "industrial_capacity", label: "Industrial Capacity" },
  { value: "revenue_generation", label: "Revenue & Royalty Generation" },
  { value: "environmental_compliance", label: "Environmental & Community Compliance" },
];

export function NationalRequirementsTab() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [subTab, setSubTab] = useState<"catalog" | "units">("catalog");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<NationalReportingRequirement | null>(null);
  const [assigningReq, setAssigningReq] = useState<NationalReportingRequirement | null>(null);

  // Queries
  const {
    data: requirements = [],
    isLoading,
    isError,
    refetch,
  } = useGetNationalRequirementsQuery({});

  const { data: unitsCatalog = {} } = useGetNationalUnitsCatalogQuery();
  const { data: customCategories = [] } = useGetNationalCategoriesQuery();
  const { data: regions = [] } = useGetRegionsQuery({ is_active: true });

  const dynamicCategories = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [
      { value: "all", label: "All Categories" },
    ];
    const seen = new Set<string>(["all"]);

    CATEGORIES.forEach((c) => {
      if (!seen.has(c.value)) {
        list.push(c);
        seen.add(c.value);
      }
    });

    customCategories.forEach((cat) => {
      if (!seen.has(cat.code)) {
        list.push({
          value: cat.code,
          label: `${cat.icon || "📊"} ${cat.label}`,
        });
        seen.add(cat.code);
      }
    });

    return list;
  }, [customCategories]);

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
  const [regionAnnualTargets, setRegionAnnualTargets] = useState<Record<string, string>>({});
  const [bulkAnnualTarget, setBulkAnnualTarget] = useState<string>("");
  const [isMandatory, setIsMandatory] = useState(true);
  const [assignNotes, setAssignNotes] = useState("");

  const handleOpenCreate = () => {
    const defaultStart = `${new Date().getFullYear()}-07-01`;
    const defaultEnd = calculateAnnualEndDate(defaultStart);
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
      effective_start_date: defaultStart,
      effective_end_date: defaultEnd,
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

  const previewPeriods =
    formData.effective_start_date && formData.effective_end_date
      ? generateReportingPeriods(
          formData.effective_start_date,
          formData.effective_end_date,
          formData.frequency
        )
      : [];

  const handleSaveRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.title.trim()) {
      toast.error("Code and Title are required");
      return;
    }

    if (formData.effective_start_date && formData.effective_end_date) {
      const check = validateAnnualDateRange(
        formData.effective_start_date,
        formData.effective_end_date
      );
      if (!check.valid) {
        toast.error(check.message);
        return;
      }
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
    const targets: Record<string, string> = {};
    req.assignments?.forEach((a) => {
      if (a.annual_target != null) {
        targets[a.region_id] = String(a.annual_target);
      }
    });
    setRegionAnnualTargets(targets);
    setBulkAnnualTarget("");
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
        regionTargets: regionAnnualTargets,
        annualTarget: bulkAnnualTarget ? Number(bulkAnnualTarget) : null,
        isMandatory,
        notes: assignNotes,
      }).unwrap();
      toast.success("Requirement assigned with regional annual targets successfully");
      setAssigningReq(null);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to assign requirement");
    }
  };

  const availableUnits =
    unitsCatalog[formData.unit_category]?.units || [formData.expected_unit];

  // Filtering data
  const filteredData = useMemo(() => {
    return requirements.filter((req) => {
      if (categoryFilter !== "all" && req.category !== categoryFilter) return false;
      if (statusFilter === "active" && !req.is_active) return false;
      if (statusFilter === "inactive" && req.is_active) return false;
      if (frequencyFilter !== "all" && req.frequency !== frequencyFilter) return false;

      return matchesSearchQuery(searchQuery, [
        req.code,
        req.title,
        req.description,
        req.expected_unit,
        req.category,
      ]);
    });
  }, [requirements, categoryFilter, statusFilter, frequencyFilter, searchQuery]);

  // Table Columns
  const columns: ColumnDef<NationalReportingRequirement>[] = [
    {
      accessorKey: "code",
      header: "Code & Title",
      cell: ({ row }) => {
        const req = row.original;
        return (
          <div className="space-y-0.5 max-w-sm">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {req.title}
            </div>
            <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {req.code}
            </div>
            {req.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                {req.description}
              </p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize text-xs bg-slate-100 dark:bg-slate-800">
          {row.original.category?.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "expected_unit",
      header: "Expected Unit",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded text-xs font-medium">
            {row.original.expected_unit}
          </span>
          <span className="text-xs text-slate-400">
            ({row.original.unit_category})
          </span>
        </div>
      ),
    },
    {
      accessorKey: "frequency",
      header: "Frequency & Annual Cycle",
      cell: ({ row }) => {
        const req = row.original;
        return (
          <div className="space-y-0.5">
            <div className="capitalize font-medium text-slate-800 dark:text-slate-200 text-xs">
              {req.frequency?.replace(/_/g, " ")}
            </div>
            {req.effective_start_date && req.effective_end_date ? (
              <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <Calendar className="h-3 w-3 shrink-0" />
                <span>
                  {req.effective_start_date} ~ {req.effective_end_date}
                </span>
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 italic">
                Standard annual cycle
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "assignments",
      header: "Assigned Regions",
      cell: ({ row }) => {
        const count = row.original.assignments?.length || 0;
        return (
          <Badge
            variant="outline"
            className={`text-xs ${
              count > 0
                ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                : "text-slate-400"
            }`}
          >
            {count} {count === 1 ? "Region" : "Regions"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => <ActiveStatusBadge isActive={row.original.is_active} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const req = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenAssign(req)}
              className="h-8 px-2 text-xs border-emerald-300 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50"
              title="Assign to Regions"
            >
              <Share2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
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
        );
      },
    },
  ];

  // Filters for TableLayout
  const filters: FilterField[] = [
    {
      key: "category",
      label: "Category",
      type: "select",
      placeholder: "All Categories",
      value: categoryFilter,
      onChange: setCategoryFilter,
      options: CATEGORIES.map((c) => ({ label: c.label, value: c.value })),
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      placeholder: "All Statuses",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { label: "All Statuses", value: "all" },
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
    {
      key: "frequency",
      label: "Frequency",
      type: "select",
      placeholder: "All Frequencies",
      value: frequencyFilter,
      onChange: setFrequencyFilter,
      options: [
        { label: "All Frequencies", value: "all" },
        { label: "Monthly", value: "monthly" },
        { label: "Quarterly", value: "quarterly" },
        { label: "Semi-Annually", value: "semi_annually" },
        { label: "Annually", value: "annually" },
      ],
    },
  ];

  // Top Actions for TableLayout
  const actions: ActionButton[] = [
    {
      label: "New Requirement",
      icon: <Plus className="h-4 w-4" />,
      variant: "default",
      onClick: handleOpenCreate,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-Tabs for Requirements Catalog vs Unit Configuration */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <Button
          variant={subTab === "catalog" ? "default" : "outline"}
          size="sm"
          onClick={() => setSubTab("catalog")}
          className={`h-8 text-xs flex items-center gap-1.5 ${
            subTab === "catalog"
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "border-slate-300 text-slate-700 dark:text-slate-300"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Requirements Catalog</span>
        </Button>

        <Button
          variant={subTab === "units" ? "default" : "outline"}
          size="sm"
          onClick={() => setSubTab("units")}
          className={`h-8 text-xs flex items-center gap-1.5 ${
            subTab === "units"
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "border-slate-300 text-slate-700 dark:text-slate-300"
          }`}
        >
          <Scale className="h-3.5 w-3.5" />
          <span>National Unit Configuration</span>
        </Button>
      </div>

      {subTab === "catalog" ? (
        <TableLayout
          title="National Reporting Requirements"
          actions={actions}
          filters={filters}
          filterColumnsPerRow={3}
        >
          <DataTable
            columns={columns}
            data={filteredData}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Failed to load national reporting requirements."
            onRetry={refetch}
            resetKey={`${searchQuery}-${categoryFilter}-${statusFilter}-${frequencyFilter}`}
          />
        </TableLayout>
      ) : (
        <NationalUnitConfigTab />
      )}

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
                    {dynamicCategories.filter((c) => c.value !== "all").map((c) => (
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
                    {Object.keys(unitsCatalog).length > 0 ? (
                      Object.keys(unitsCatalog).map((catKey) => (
                        <SelectItem key={catKey} value={catKey} className="capitalize">
                          {catKey.replace(/_/g, " ")}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="mass">Mass / Weight</SelectItem>
                        <SelectItem value="volume">Volume</SelectItem>
                        <SelectItem value="count">Count / Quantity</SelectItem>
                        <SelectItem value="area">Area</SelectItem>
                        <SelectItem value="currency">Currency / Value</SelectItem>
                      </>
                    )}
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

            {/* Annual Reporting Period Configuration */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Annual Reporting Cycle & Date Selection
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Configure the annual start date and end date. The reporting cycle does not have to match January–December. Periods will be derived continuously across this annual range.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <Label htmlFor="req-start-date" className="text-xs font-medium">
                    Annual Start Date *
                  </Label>
                  <Input
                    id="req-start-date"
                    type="date"
                    value={formData.effective_start_date}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      const autoEnd = calculateAnnualEndDate(newStart);
                      setFormData({
                        ...formData,
                        effective_start_date: newStart,
                        effective_end_date: autoEnd || formData.effective_end_date,
                      });
                    }}
                    required
                    className="mt-1"
                  />
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Selecting start date automatically computes standard 1-year end date.
                  </p>
                </div>

                <div>
                  <Label htmlFor="req-end-date" className="text-xs font-medium">
                    Annual End Date *
                  </Label>
                  <Input
                    id="req-end-date"
                    type="date"
                    value={formData.effective_end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, effective_end_date: e.target.value })
                    }
                    required
                    className="mt-1"
                  />
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    End of the full annual reporting window (~365 days).
                  </p>
                </div>
              </div>

              {/* Recurring Periods Live Preview */}
              {previewPeriods.length > 0 && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Recurring Submissions Schedule ({previewPeriods.length} Periods)
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {formData.frequency.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {previewPeriods.map((p) => (
                      <div
                        key={p.period_index}
                        className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center"
                      >
                        <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          {p.period_label}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {p.start_date}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          to {p.end_date}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Requirement & Preset Regional Annual Targets</DialogTitle>
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

              {/* Baseline / Bulk Annual Target Helper */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Preset Baseline Annual Target ({assigningReq.expected_unit})
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2.5"
                    onClick={() => {
                      if (!bulkAnnualTarget) {
                        toast.error("Please enter a baseline annual target value first");
                        return;
                      }
                      const newTargets = { ...regionAnnualTargets };
                      selectedRegionIds.forEach((rid) => {
                        newTargets[rid] = bulkAnnualTarget;
                      });
                      setRegionAnnualTargets(newTargets);
                      toast.info(`Applied target ${bulkAnnualTarget} ${assigningReq.expected_unit} to ${selectedRegionIds.length} selected regions`);
                    }}
                  >
                    Apply Target to Selected Regions
                  </Button>
                </div>
                <Input
                  type="number"
                  placeholder={`e.g. 50000 (${assigningReq.expected_unit})`}
                  value={bulkAnnualTarget}
                  onChange={(e) => setBulkAnnualTarget(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
                <p className="text-[11px] text-slate-500">
                  Different regions can have different annual targets. Regional users only submit their period actuals, and all performance is analyzed against their preset target.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Select Regional States & Annual Targets *</Label>
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

                <div className="space-y-2 max-h-64 overflow-y-auto p-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950">
                  {regions.map((region) => {
                    const isChecked = selectedRegionIds.includes(region.region_id);
                    return (
                      <div
                        key={region.region_id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded text-sm transition-colors border ${
                          isChecked
                            ? "bg-emerald-50/70 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 font-medium text-emerald-950 dark:text-emerald-100"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRegionIds([...selectedRegionIds, region.region_id]);
                                if (bulkAnnualTarget && !regionAnnualTargets[region.region_id]) {
                                  setRegionAnnualTargets({
                                    ...regionAnnualTargets,
                                    [region.region_id]: bulkAnnualTarget,
                                  });
                                }
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

                        {isChecked && (
                          <div className="flex items-center gap-1.5 pl-6 sm:pl-0">
                            <span className="text-xs text-slate-500 font-normal">Annual Target:</span>
                            <Input
                              type="number"
                              placeholder="Preset target"
                              value={regionAnnualTargets[region.region_id] || ""}
                              onChange={(e) => {
                                setRegionAnnualTargets({
                                  ...regionAnnualTargets,
                                  [region.region_id]: e.target.value,
                                });
                              }}
                              className="w-32 h-7 text-xs font-mono px-2 py-0 bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700"
                            />
                            <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
                              {assigningReq.expected_unit}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3">
                <Label htmlFor="assign-mandatory" className="text-sm font-semibold">
                  Mandatory for Selected Regions
                </Label>
                <Switch
                  id="assign-mandatory"
                  checked={isMandatory}
                  onCheckedChange={setIsMandatory}
                />
              </div>

              <div>
                <Label htmlFor="assign-notes">Assignment Notes</Label>
                <Textarea
                  id="assign-notes"
                  placeholder="Specific regional targets or instructions..."
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setAssigningReq(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAssignment}
                  disabled={isAssigning}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isAssigning ? "Saving..." : "Save Regional Assignments"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
