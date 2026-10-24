"use client";

import { useState, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Coins,
  PlusCircle,
  Edit,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowUpDown,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useGetGoldPricesQuery,
  useCreateGoldPriceMutation,
  useUpdateGoldPriceMutation,
  useDeleteGoldPriceMutation,
  useGetGoldUnitsQuery,
} from "@/redux/api/goldApi";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { GoldOperationsTabsHeader } from "./GoldOperationsTabsHeader";
import type { GoldPriceConfiguration, CreateGoldPricePayload } from "@/redux/types/gold";

const GOLD_TYPES = [
  "Raw/Placer Gold",
  "Smelted Bar",
  "Refined Bullion",
  "Gold Dust",
  "Gold Nugget",
  "Dore Bar",
];

const KARAT_OPTIONS = [
  { label: "24K (99.9% Pure)", value: "24K", purity: 99.9 },
  { label: "22K (91.6% Pure)", value: "22K", purity: 91.6 },
  { label: "21K (87.5% Pure)", value: "21K", purity: 87.5 },
  { label: "18K (75.0% Pure)", value: "18K", purity: 75.0 },
  { label: "14K (58.5% Pure)", value: "14K", purity: 58.5 },
  { label: "Raw / Unrefined", value: "Raw", purity: 80.0 },
];

const QUALITY_GRADES = [
  { label: "Grade A - High Purity Export Grade", value: "Grade A" },
  { label: "Grade B - Standard Commercial Grade", value: "Grade B" },
  { label: "Grade C - Artisanal / Small-Scale Grade", value: "Grade C" },
  { label: "Grade D - Low Purity / Alluvial Aggregate", value: "Grade D" },
];

export function GoldPriceConfigurationTable() {
  const { can, canAny } = usePermissions();

  const { data: priceConfigs = [], isLoading, isError, refetch } = useGetGoldPricesQuery();
  const { data: units = [] } = useGetGoldUnitsQuery();

  const [createPrice, { isLoading: isCreating }] = useCreateGoldPriceMutation();
  const [updatePrice, { isLoading: isUpdating }] = useUpdateGoldPriceMutation();
  const [deletePrice, { isLoading: isDeleting }] = useDeleteGoldPriceMutation();

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createGoldType, setCreateGoldType] = useState(GOLD_TYPES[0]);
  const [createKarat, setCreateKarat] = useState("24K");
  const [createPurity, setCreatePurity] = useState("99.9");
  const [createQuality, setCreateQuality] = useState(QUALITY_GRADES[0].value);
  const [createUnitId, setCreateUnitId] = useState("");
  const [createPricePerUnit, setCreatePricePerUnit] = useState("");
  const [createMinPrice, setCreateMinPrice] = useState("");
  const [createMaxPrice, setCreateMaxPrice] = useState("");
  const [createEffectiveDate, setCreateEffectiveDate] = useState(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Addis_Ababa",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  });
  const [createNotes, setCreateNotes] = useState("");

  // Edit Modal State
  const [editingConfig, setEditingConfig] = useState<GoldPriceConfiguration | null>(null);

  // Search and Filters
  const [search, setSearch] = useState("");
  const [selectedKarat, setSelectedKarat] = useState<string>("all");
  const [selectedGoldType, setSelectedGoldType] = useState<string>("all");
  const [selectedQuality, setSelectedQuality] = useState<string>("all");

  const canManage = canAny([
    "GOLD_PRICES:CREATE",
    "GOLD_PRICES:UPDATE",
    "GOLD_PRICES:MANAGE",
    "GOLD_OVERSIGHT:MANAGE",
  ]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(createPricePerUnit);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price per unit greater than 0.");
      return;
    }

    const minPrice = createMinPrice ? parseFloat(createMinPrice) : undefined;
    const maxPrice = createMaxPrice ? parseFloat(createMaxPrice) : undefined;

    if (minPrice && maxPrice && minPrice > maxPrice) {
      toast.error("Minimum price cannot be greater than maximum price.");
      return;
    }

    try {
      const payload: CreateGoldPricePayload = {
        gold_type: createGoldType,
        karat: createKarat,
        purity_percentage: createPurity ? parseFloat(createPurity) : undefined,
        quality_grade: createQuality,
        measurement_unit_id: createUnitId || undefined,
        price_per_unit: price,
        min_price_per_unit: minPrice,
        max_price_per_unit: maxPrice,
        effective_date: createEffectiveDate || undefined,
        notes: createNotes.trim() || undefined,
        is_active: true,
      };

      await createPrice(payload).unwrap();
      toast.success("Gold price configuration created successfully!");
      setIsCreateOpen(false);
      setCreatePricePerUnit("");
      setCreateMinPrice("");
      setCreateMaxPrice("");
      setCreateNotes("");
      refetch();
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      toast.error(errorObj?.data?.message || errorObj?.message || "Failed to create price configuration.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig) return;

    const price = parseFloat(String(editingConfig.price_per_unit));
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price per unit.");
      return;
    }

    const minPrice = editingConfig.min_price_per_unit ? parseFloat(String(editingConfig.min_price_per_unit)) : undefined;
    const maxPrice = editingConfig.max_price_per_unit ? parseFloat(String(editingConfig.max_price_per_unit)) : undefined;

    if (minPrice && maxPrice && minPrice > maxPrice) {
      toast.error("Minimum price cannot be greater than maximum price.");
      return;
    }

    try {
      await updatePrice({
        id: editingConfig.price_config_id,
        data: {
          gold_type: editingConfig.gold_type,
          karat: editingConfig.karat,
          purity_percentage: editingConfig.purity_percentage ? parseFloat(String(editingConfig.purity_percentage)) : undefined,
          quality_grade: editingConfig.quality_grade,
          measurement_unit_id: editingConfig.measurement_unit_id || undefined,
          price_per_unit: price,
          min_price_per_unit: minPrice,
          max_price_per_unit: maxPrice,
          effective_date: editingConfig.effective_date,
          is_active: editingConfig.is_active,
          notes: editingConfig.notes?.trim() || undefined,
        },
      }).unwrap();

      toast.success("Gold price configuration updated successfully!");
      setEditingConfig(null);
      refetch();
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      toast.error(errorObj?.data?.message || errorObj?.message || "Failed to update price configuration.");
    }
  };

  const handleToggleStatus = async (item: GoldPriceConfiguration) => {
    try {
      await updatePrice({
        id: item.price_config_id,
        data: {
          is_active: !item.is_active,
        },
      }).unwrap();
      toast.success(`Price configuration marked as ${!item.is_active ? "Active" : "Inactive"}.`);
      refetch();
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      toast.error(errorObj?.data?.message || errorObj?.message || "Failed to update status.");
    }
  };

  const handleDelete = async (item: GoldPriceConfiguration) => {
    if (!window.confirm(`Are you sure you want to delete the price benchmark for ${item.karat} ${item.gold_type}?`)) {
      return;
    }
    try {
      await deletePrice(item.price_config_id).unwrap();
      toast.success("Price configuration deleted.");
      refetch();
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      toast.error(errorObj?.data?.message || errorObj?.message || "Failed to delete price configuration.");
    }
  };

  const filteredData = useMemo(() => {
    return priceConfigs.filter((item) => {
      const matchesSearch =
        search === "" ||
        item.gold_type.toLowerCase().includes(search.toLowerCase()) ||
        item.karat.toLowerCase().includes(search.toLowerCase()) ||
        item.quality_grade.toLowerCase().includes(search.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(search.toLowerCase()));

      const matchesKarat = selectedKarat === "all" || item.karat === selectedKarat;
      const matchesGoldType = selectedGoldType === "all" || item.gold_type === selectedGoldType;
      const matchesQuality = selectedQuality === "all" || item.quality_grade === selectedQuality;

      return matchesSearch && matchesKarat && matchesGoldType && matchesQuality;
    });
  }, [priceConfigs, search, selectedKarat, selectedGoldType, selectedQuality]);

  const columns: ColumnDef<GoldPriceConfiguration>[] = useMemo(
    () => [
      {
        accessorKey: "karat",
        header: "Karat & Purity",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center font-bold text-xs text-amber-700 dark:text-amber-400 shrink-0">
                {item.karat}
              </div>
              <div>
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  {item.karat}
                  {item.purity_percentage && (
                    <span className="text-xs font-mono text-muted-foreground">
                      ({parseFloat(String(item.purity_percentage))}% pure)
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{item.gold_type}</div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "quality_grade",
        header: "Quality Grade",
        cell: ({ row }) => {
          const grade = row.original.quality_grade;
          let badgeVariant: "default" | "secondary" | "outline" = "outline";
          let badgeClass = "text-xs";
          if (grade.includes("Grade A")) {
            badgeClass = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-semibold";
          } else if (grade.includes("Grade B")) {
            badgeClass = "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 font-semibold";
          } else {
            badgeClass = "bg-muted text-muted-foreground border-border";
          }
          return <Badge variant={badgeVariant} className={badgeClass}>{grade}</Badge>;
        },
      },
      {
        accessorKey: "price_per_unit",
        header: "Benchmark Price / Unit",
        cell: ({ row }) => {
          const item = row.original;
          const unitSymbol = item.measurementUnit?.symbol || "g";
          const price = parseFloat(String(item.price_per_unit));
          return (
            <div>
              <div className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                <span className="text-xs font-normal text-muted-foreground">{item.currency || "ETB"} / {unitSymbol}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">Official Base Rate</div>
            </div>
          );
        },
      },
      {
        header: "Permitted Range (Min - Max)",
        cell: ({ row }) => {
          const item = row.original;
          const unitSymbol = item.measurementUnit?.symbol || "g";
          if (!item.min_price_per_unit && !item.max_price_per_unit) {
            return <span className="text-xs text-muted-foreground italic">Standard Rate (Fixed)</span>;
          }
          const min = item.min_price_per_unit ? parseFloat(String(item.min_price_per_unit)).toLocaleString() : "—";
          const max = item.max_price_per_unit ? parseFloat(String(item.max_price_per_unit)).toLocaleString() : "—";
          return (
            <div className="text-xs font-mono">
              <span className="text-muted-foreground">{min}</span>
              <span className="mx-1 text-border">→</span>
              <span className="font-semibold text-foreground">{max} {item.currency || "ETB"}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "effective_date",
        header: "Effective Date",
        cell: ({ row }) => {
          const dateStr = row.original.effective_date;
          return (
            <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {dateStr || "Current"}
            </div>
          );
        },
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => {
          const active = row.original.is_active;
          return (
            <Badge
              variant={active ? "default" : "secondary"}
              className={
                active
                  ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold"
                  : "text-[10px]"
              }
            >
              {active ? "Active Benchmark" : "Inactive"}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const item = row.original;
          if (!canManage) return null;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingConfig(item)}
                className="h-8 px-2 text-xs"
                title="Edit Configuration"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleStatus(item)}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                title={item.is_active ? "Deactivate" : "Activate"}
              >
                {item.is_active ? "Disable" : "Enable"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(item)}
                className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    [canManage]
  );

  return (
    <div className="space-y-6">
      <GoldOperationsTabsHeader />

      <TableLayout
        title="Gold Price Configuration"
        description="Configure unit purchase rates and allowed tolerance ranges based on gold type, karat purity, quality grade, and measurement units. Purchasing center registrars use these official benchmarks or record custom expert evaluations."
        actions={
          canManage
            ? [
                {
                  label: "New Price Configuration",
                  icon: <PlusCircle className="h-4 w-4" />,
                  onClick: () => setIsCreateOpen(true),
                },
              ]
            : []
        }
      >
        {/* Custom Filter Bar */}
        <div className="p-4 border-b border-border bg-card/50 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] max-w-sm">
            <Input
              placeholder="Search by karat, type, quality..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <Select value={selectedKarat} onValueChange={setSelectedKarat}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Karat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Karats</SelectItem>
              {KARAT_OPTIONS.map((k) => (
                <SelectItem key={k.value} value={k.value}>
                  {k.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedGoldType} onValueChange={setSelectedGoldType}>
            <SelectTrigger className="w-[170px] h-9 text-xs">
              <SelectValue placeholder="Gold Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Gold Types</SelectItem>
              {GOLD_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedQuality} onValueChange={setSelectedQuality}>
            <SelectTrigger className="w-[170px] h-9 text-xs">
              <SelectValue placeholder="Quality Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Qualities</SelectItem>
              {QUALITY_GRADES.map((q) => (
                <SelectItem key={q.value} value={q.value}>
                  {q.label.split(" - ")[0]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(search || selectedKarat !== "all" || selectedGoldType !== "all" || selectedQuality !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setSelectedKarat("all");
                setSelectedGoldType("all");
                setSelectedQuality("all");
              }}
              className="h-9 px-2 text-xs"
            >
              Reset
            </Button>
          )}
        </div>

        <DataTable
          columns={columns}
          data={filteredData}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
        />
      </TableLayout>

      {/* CREATE MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" />
              Configure Official Gold Purchase Rate
            </DialogTitle>
            <DialogDescription>
              Set benchmark unit price per karat, quality grade, and measurement unit. This rate will auto-populate in purchase registries.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Gold Type *</Label>
                <Select value={createGoldType} onValueChange={setCreateGoldType}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOLD_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Karat Grade *</Label>
                <Select
                  value={createKarat}
                  onValueChange={(val) => {
                    setCreateKarat(val);
                    const matched = KARAT_OPTIONS.find((k) => k.value === val);
                    if (matched) setCreatePurity(String(matched.purity));
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KARAT_OPTIONS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Purity Percentage (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={createPurity}
                  onChange={(e) => setCreatePurity(e.target.value)}
                  placeholder="e.g. 99.9"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Quality Grading *</Label>
                <Select value={createQuality} onValueChange={setCreateQuality}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALITY_GRADES.map((q) => (
                      <SelectItem key={q.value} value={q.value}>
                        {q.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Measurement Unit</Label>
                <Select value={createUnitId} onValueChange={setCreateUnitId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Standard Gram (g)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Standard Canonical Gram (g)</SelectItem>
                    {units.map((u) => (
                      <SelectItem key={u.unit_id} value={u.unit_id}>
                        {u.name} ({u.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Effective Date *</Label>
                <Input
                  type="date"
                  value={createEffectiveDate}
                  onChange={(e) => setCreateEffectiveDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Official Benchmark Price Per Unit (ETB) *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="e.g. 4850.00"
                  value={createPricePerUnit}
                  onChange={(e) => setCreatePricePerUnit(e.target.value)}
                  className="h-10 text-sm font-mono font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Floor / Min Price (ETB)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Optional floor"
                    value={createMinPrice}
                    onChange={(e) => setCreateMinPrice(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Ceiling / Max Price (ETB)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Optional ceiling"
                    value={createMaxPrice}
                    onChange={(e) => setCreateMaxPrice(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Regulatory Notes / Directives</Label>
              <Textarea
                rows={2}
                placeholder="Reference regulatory circular or market condition basis..."
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isCreating} className="gap-1.5">
                {isCreating ? "Saving Benchmark..." : "Save Price Configuration"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={Boolean(editingConfig)} onOpenChange={(open) => !open && setEditingConfig(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Edit Benchmark Price Configuration
            </DialogTitle>
            <DialogDescription>
              Update price configuration parameters for {editingConfig?.karat} {editingConfig?.gold_type}.
            </DialogDescription>
          </DialogHeader>

          {editingConfig && (
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Gold Type</Label>
                  <Select
                    value={editingConfig.gold_type}
                    onValueChange={(val) => setEditingConfig({ ...editingConfig, gold_type: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GOLD_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Karat Grade</Label>
                  <Select
                    value={editingConfig.karat}
                    onValueChange={(val) => setEditingConfig({ ...editingConfig, karat: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KARAT_OPTIONS.map((k) => (
                        <SelectItem key={k.value} value={k.value}>
                          {k.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Quality Grade</Label>
                  <Select
                    value={editingConfig.quality_grade}
                    onValueChange={(val) => setEditingConfig({ ...editingConfig, quality_grade: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUALITY_GRADES.map((q) => (
                        <SelectItem key={q.value} value={q.value}>
                          {q.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Effective Date</Label>
                  <Input
                    type="date"
                    value={editingConfig.effective_date}
                    onChange={(e) => setEditingConfig({ ...editingConfig, effective_date: e.target.value })}
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Benchmark Price Per Unit (ETB) *
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    value={editingConfig.price_per_unit}
                    onChange={(e) => setEditingConfig({ ...editingConfig, price_per_unit: e.target.value })}
                    className="h-10 text-sm font-mono font-bold"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Floor Price (ETB)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingConfig.min_price_per_unit ?? ""}
                      onChange={(e) =>
                        setEditingConfig({
                          ...editingConfig,
                          min_price_per_unit: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Ceiling Price (ETB)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingConfig.max_price_per_unit ?? ""}
                      onChange={(e) =>
                        setEditingConfig({
                          ...editingConfig,
                          max_price_per_unit: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Notes</Label>
                <Textarea
                  rows={2}
                  value={editingConfig.notes ?? ""}
                  onChange={(e) => setEditingConfig({ ...editingConfig, notes: e.target.value })}
                  className="text-xs resize-none"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingConfig(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isUpdating} className="gap-1.5">
                  {isUpdating ? "Saving..." : "Update Benchmark"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
