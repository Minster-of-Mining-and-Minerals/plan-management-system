"use client";

import { useState } from "react";
import {
  Scale,
  PlusCircle,
  Edit,
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
import Loading01 from "@/features/template/component/Loading/Loading01";
import type { GoldMeasurementUnit } from "@/redux/types/gold";

export function MeasurementUnitsView() {
  const { can } = usePermissions();

  const { data: units = [], isLoading, refetch } = useGetGoldUnitsQuery();
  const [createUnit, { isLoading: isCreating }] = useCreateGoldUnitMutation();
  const [updateUnit, { isLoading: isUpdating }] = useUpdateGoldUnitMutation();
  const [toggleStatus] = useToggleGoldUnitStatusMutation();

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

  const handleToggle = async (unit: GoldMeasurementUnit) => {
    if (unit.is_canonical_base && unit.is_active) {
      toast.error("The canonical base unit cannot be deactivated.");
      return;
    }

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

  return (
    <div className="space-y-6">
      {/* ----------------- TOP HEADER ----------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Scale className="h-7 w-7 text-primary" />
            Configurable Gold Measurement Units
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dynamic weight registry with standardized canonical conversions to grams. Historical transactions preserve their recorded units non-lossily.
          </p>
        </div>

        {can("GOLD_UNITS:CREATE") && (
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 font-semibold shadow-sm shrink-0">
            <PlusCircle className="h-4 w-4" /> Add Measurement Unit
          </Button>
        )}
      </div>

      {/* ----------------- UNITS CARDS GRID ----------------- */}
      {isLoading ? (
        <div className="p-12">
          <Loading01 />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {units.map((u) => (
            <div
              key={u.unit_id}
              className={`p-6 rounded-3xl bg-card border shadow-xs space-y-4 relative overflow-hidden transition-all ${
                u.is_canonical_base
                  ? "border-amber-500/50 dark:border-amber-500/40"
                  : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base uppercase shrink-0 ${
                      u.is_canonical_base
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {u.symbol}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">{u.name}</h3>
                    <p className="text-xs font-mono text-muted-foreground">Code: {u.code}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-col items-end">
                  {u.is_canonical_base && (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]">
                      Canonical Base (1.0g)
                    </Badge>
                  )}
                  <Badge
                    variant={u.is_active ? "default" : "secondary"}
                    className={
                      u.is_active
                        ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px]"
                        : "text-[10px]"
                    }
                  >
                    {u.is_active ? "Active" : "Deactivated"}
                  </Badge>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                <p className="text-xs text-muted-foreground">Standardized Conversion Factor</p>
                <p className="text-sm font-bold font-mono text-foreground">
                  1 {u.symbol} = {parseFloat(String(u.conversion_factor)).toLocaleString()} grams
                </p>
              </div>

              {u.description && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {u.description}
                </p>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-border">
                <span className="text-[11px] text-muted-foreground">
                  {u.is_canonical_base ? "Official base currency standard" : "Approved measurement unit"}
                </span>
                <div className="flex items-center gap-1">
                  {can("GOLD_UNITS:UPDATE") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingUnit(u)}
                      className="h-8 px-2 text-xs"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {can("GOLD_UNITS:DEACTIVATE") && !u.is_canonical_base && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggle(u)}
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {u.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ----------------- CREATE MODAL ----------------- */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                Add Approved Gold Measurement Unit
              </DialogTitle>
              <DialogDescription>
                Define an approved weighing standard and specify its exact conversion factor to canonical grams.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Unit Name *</Label>
                <Input
                  required
                  placeholder="e.g. Tola, Mithqal, Troy Ounce"
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
                    placeholder="e.g. tola, mth"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="h-9 text-sm font-mono lowercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Symbol *</Label>
                  <Input
                    required
                    placeholder="e.g. tola, oz t"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Conversion Factor to Grams *</Label>
                <Input
                  required
                  type="number"
                  step="0.000001"
                  min="0.000001"
                  placeholder="e.g. 11.663804"
                  value={conversionFactor}
                  onChange={(e) => setConversionFactor(e.target.value)}
                  className="h-9 text-sm font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Number of grams equivalent to exactly 1.0 of this unit.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Description</Label>
                <Textarea
                  placeholder="Regional context, traditional usage, market trading origin..."
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
