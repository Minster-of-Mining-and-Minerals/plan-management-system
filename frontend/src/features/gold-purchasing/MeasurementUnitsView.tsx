"use client";

import { useState, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Scale,
  PlusCircle,
  Edit,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  useGetGoldUnitsQuery,
  useCreateGoldUnitMutation,
  useUpdateGoldUnitMutation,
  useToggleGoldUnitStatusMutation,
} from "@/redux/api/goldApi";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { GoldOperationsTabsHeader } from "./GoldOperationsTabsHeader";
import type { GoldMeasurementUnit } from "@/redux/types/gold";

export function MeasurementUnitsView() {
  const { can } = usePermissions();

  const { data: units = [], isLoading, isError, refetch } = useGetGoldUnitsQuery();
  const [createUnit, { isLoading: isCreating }] = useCreateGoldUnitMutation();
  const [updateUnit, { isLoading: isUpdating }] = useUpdateGoldUnitMutation();
  const [toggleStatus] = useToggleGoldUnitStatusMutation();

  // Search filter
  const [search, setSearch] = useState("");

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [conversionFactor, setConversionFactor] = useState("1.0");

  // Edit Modal State
  const [editingUnit, setEditingUnit] = useState<GoldMeasurementUnit | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !symbol.trim()) {
      toast.error("Name, unique code, and symbol are required.");
      return;
    }

    const factor = parseFloat(conversionFactor);
    if (isNaN(factor) || factor <= 0) {
      toast.error("Conversion factor must be a positive decimal number.");
      return;
    }

    try {
      await createUnit({
        name: name.trim(),
        code: code.trim().toLowerCase(),
        symbol: symbol.trim(),
        description: description.trim() || undefined,
        conversion_factor: factor,
      }).unwrap();

      toast.success("Measurement unit created successfully!");
      setIsCreateOpen(false);
      setName("");
      setCode("");
      setSymbol("");
      setDescription("");
      setConversionFactor("1.0");
      refetch();
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      toast.error(errorObj?.data?.message || errorObj?.message || "Failed to create measurement unit.");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;

    try {
      await updateUnit({
        id: editingUnit.unit_id,
        data: {
          name: editingUnit.name.trim(),
          symbol: editingUnit.symbol.trim(),
          description: editingUnit.description?.trim() || undefined,
        },
      }).unwrap();

      toast.success("Measurement unit updated successfully!");
      setEditingUnit(null);
      refetch();
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      toast.error(errorObj?.data?.message || errorObj?.message || "Failed to update measurement unit.");
    }
  };

  const handleToggleStatus = async (unit: GoldMeasurementUnit) => {
    try {
      await toggleStatus({
        id: unit.unit_id,
        is_active: !unit.is_active,
      }).unwrap();

      toast.success(`Unit '${unit.name}' ${!unit.is_active ? "activated" : "deactivated"}.`);
      refetch();
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      toast.error(errorObj?.data?.message || errorObj?.message || "Failed to update unit status.");
    }
  };

  const filteredData = useMemo(() => {
    if (!search.trim()) return units;
    const term = search.toLowerCase();
    return units.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.code.toLowerCase().includes(term) ||
        u.symbol.toLowerCase().includes(term) ||
        (u.description && u.description.toLowerCase().includes(term))
    );
  }, [units, search]);

  const columns: ColumnDef<GoldMeasurementUnit>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Unit Name & Code",
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs uppercase shrink-0 border ${
                  u.is_canonical_base
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
                    : "bg-muted border-border text-foreground"
                }`}
              >
                {u.symbol}
              </div>
              <div>
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  {u.name}
                  {u.is_canonical_base && (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] py-0 px-1.5">
                      Canonical Base
                    </Badge>
                  )}
                </div>
                <div className="text-xs font-mono text-muted-foreground">code: {u.code}</div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "symbol",
        header: "Symbol",
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono font-bold text-xs px-2.5 py-0.5">
            {row.original.symbol}
          </Badge>
        ),
      },
      {
        accessorKey: "conversion_factor",
        header: "Canonical Conversion Factor",
        cell: ({ row }) => {
          const u = row.original;
          const factor = parseFloat(String(u.conversion_factor));
          return (
            <div>
              <div className="font-mono font-bold text-foreground text-sm">
                1 {u.symbol} = {factor.toLocaleString(undefined, { maximumFractionDigits: 6 })} g
              </div>
              <div className="text-[11px] text-muted-foreground">Standardized metric weight</div>
            </div>
          );
        },
      },
      {
        accessorKey: "description",
        header: "Description / Standard",
        cell: ({ row }) => {
          const desc = row.original.description;
          return (
            <div className="text-xs text-muted-foreground max-w-sm line-clamp-2">
              {desc || "Standard national measurement unit"}
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
              {active ? "Active" : "Deactivated"}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              {can("GOLD_UNITS:UPDATE") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingUnit(u)}
                  className="h-8 px-2 text-xs"
                  title="Edit Unit"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              )}
              {can("GOLD_UNITS:DEACTIVATE") && !u.is_canonical_base && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleStatus(u)}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {u.is_active ? "Deactivate" : "Activate"}
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [can]
  );

  return (
    <div className="space-y-6">
      <GoldOperationsTabsHeader />

      <TableLayout
        title="Configurable Gold Measurement Units"
        description="Dynamic weight registry with standardized canonical conversions to grams. Historical transactions preserve their recorded units non-lossily."
        actions={
          can("GOLD_UNITS:CREATE")
            ? [
                {
                  label: "Add Measurement Unit",
                  icon: <PlusCircle className="h-4 w-4" />,
                  onClick: () => setIsCreateOpen(true),
                },
              ]
            : []
        }
      >
        <div className="p-4 border-b border-border bg-card/50 flex items-center justify-between gap-3">
          <div className="max-w-sm w-full">
            <Input
              placeholder="Search units by name, symbol, or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          {search && (
            <Button variant="ghost" size="sm" onClick={() => setSearch("")} className="h-9 px-2 text-xs">
              Clear
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

      {/* ----------------- CREATE MODAL ----------------- */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                Add Measurement Unit
              </DialogTitle>
              <DialogDescription>
                Define a new weight unit and its exact conversion multiplier to standard grams (1 unit = X grams).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Unit Name *</Label>
                <Input
                  required
                  placeholder="e.g. Shekel, Tola, Ounce, Waqet"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Unique Code *</Label>
                  <Input
                    required
                    placeholder="e.g. shekel"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="h-9 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Symbol *</Label>
                  <Input
                    required
                    placeholder="e.g. sh, oz, tl"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="h-9 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Conversion Factor (Grams) *</Label>
                <Input
                  required
                  type="number"
                  step="0.000001"
                  min="0.000001"
                  placeholder="e.g. 11.4 for Shekel, 31.1035 for Troy Oz"
                  value={conversionFactor}
                  onChange={(e) => setConversionFactor(e.target.value)}
                  className="h-9 text-sm font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Specifies how many grams are in 1 unit of this measurement.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Description</Label>
                <Textarea
                  placeholder="Cultural or customary weight description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Saving..." : "Create Unit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ----------------- EDIT MODAL ----------------- */}
      <Dialog open={Boolean(editingUnit)} onOpenChange={(open) => !open && setEditingUnit(null)}>
        <DialogContent className="max-w-md">
          {editingUnit && (
            <form onSubmit={handleUpdate}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5 text-primary" />
                  Edit Measurement Unit
                </DialogTitle>
                <DialogDescription>
                  Update permitted metadata for {editingUnit.name}. Conversion factor and code are locked for units with recorded transactions to preserve historical data integrity.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Unit Name *</Label>
                  <Input
                    required
                    value={editingUnit.name}
                    onChange={(e) => setEditingUnit({ ...editingUnit, name: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Symbol *</Label>
                  <Input
                    required
                    value={editingUnit.symbol}
                    onChange={(e) => setEditingUnit({ ...editingUnit, symbol: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Description</Label>
                  <Textarea
                    value={editingUnit.description || ""}
                    onChange={(e) =>
                      setEditingUnit({ ...editingUnit, description: e.target.value })
                    }
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingUnit(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Saving..." : "Update Unit"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
