"use client";

import { useState, useMemo } from "react";
import {
  Scale,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  Layers,
  ArrowRight,
  Filter,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Loading01 from "@/features/template/component/Loading/Loading01";

import {
  useGetProductionItemsQuery,
  useCreateProductionItemMutation,
  useUpdateProductionItemMutation,
  useDeleteProductionItemMutation,
  useGetMeasurementUnitsQuery,
} from "@/redux/api/productionApi";
import type { ProductionItem } from "@/redux/types/production";

export function ProductionItemsView() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductionItem | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [baseUnitId, setBaseUnitId] = useState("");
  const [defaultUnitId, setDefaultUnitId] = useState("");
  const [selectedUnits, setSelectedUnits] = useState<Record<string, { factor: string; isDefault: boolean }>>({});
  const [formError, setFormError] = useState("");

  const { data: items = [], isLoading, refetch } = useGetProductionItemsQuery();
  const { data: units = [] } = useGetMeasurementUnitsQuery();
  const [createItem, { isLoading: isCreating }] = useCreateProductionItemMutation();
  const [updateItem, { isLoading: isUpdating }] = useUpdateProductionItemMutation();
  const [deleteItem] = useDeleteProductionItemMutation();

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      const matchesSearch =
        !search.trim() ||
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.code.toLowerCase().includes(search.toLowerCase()) ||
        (i.category && i.category.toLowerCase().includes(search.toLowerCase()));

      const matchesCat =
        selectedCategory === "all" || i.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [items, search, selectedCategory]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setName("");
    setCode("");
    setDescription("");
    setCategory("");
    const defaultBase = units[0]?.unit_id || "";
    setBaseUnitId(defaultBase);
    setDefaultUnitId(defaultBase);
    setSelectedUnits(defaultBase ? { [defaultBase]: { factor: "1.0", isDefault: true } } : {});
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ProductionItem) => {
    setEditingItem(item);
    setName(item.name);
    setCode(item.code);
    setDescription(item.description || "");
    setCategory(item.category || "");
    setBaseUnitId(item.base_unit_id);
    setDefaultUnitId(item.default_reporting_unit_id || item.base_unit_id);

    const unitMap: Record<string, { factor: string; isDefault: boolean }> = {};
    if (item.supportedUnits && item.supportedUnits.length > 0) {
      item.supportedUnits.forEach((su) => {
        unitMap[su.unit_id] = {
          factor: String(su.conversion_factor_to_base || "1.0"),
          isDefault: su.is_default,
        };
      });
    } else {
      unitMap[item.base_unit_id] = { factor: "1.0", isDefault: true };
    }
    setSelectedUnits(unitMap);
    setFormError("");
    setIsModalOpen(true);
  };

  const toggleUnitSelection = (unitId: string) => {
    if (unitId === baseUnitId) return; // Base unit always selected
    setSelectedUnits((prev) => {
      const next = { ...prev };
      if (next[unitId]) {
        delete next[unitId];
      } else {
        const u = units.find((x: any) => x.unit_id === unitId);
        const baseU = units.find((x: any) => x.unit_id === baseUnitId);
        let factor = "1.0";
        if (u && baseU && Number(baseU.conversion_factor) > 0) {
          factor = String(Number(u.conversion_factor) / Number(baseU.conversion_factor));
        }
        next[unitId] = { factor, isDefault: false };
      }
      return next;
    });
  };

  const handleFactorChange = (unitId: string, factor: string) => {
    setSelectedUnits((prev) => ({
      ...prev,
      [unitId]: {
        ...(prev[unitId] || { isDefault: false }),
        factor,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim() || !code.trim() || !baseUnitId) {
      setFormError("Name, Code, and Base Unit are required.");
      return;
    }

    const supportedUnitsPayload = Object.entries(selectedUnits).map(([uId, cfg]) => ({
      unit_id: uId,
      conversion_factor_to_base: parseFloat(cfg.factor) || 1.0,
      is_default: uId === defaultUnitId,
    }));

    // Ensure base unit is included
    if (!supportedUnitsPayload.some((u) => u.unit_id === baseUnitId)) {
      supportedUnitsPayload.unshift({
        unit_id: baseUnitId,
        conversion_factor_to_base: 1.0,
        is_default: defaultUnitId === baseUnitId,
      });
    }

    try {
      if (editingItem) {
        await updateItem({
          id: editingItem.production_item_id,
          data: {
            name: name.trim(),
            description: description.trim() || undefined,
            category: category.trim() || undefined,
            default_reporting_unit_id: defaultUnitId || baseUnitId,
            supported_units: supportedUnitsPayload,
          },
        }).unwrap();
      } else {
        await createItem({
          name: name.trim(),
          code: code.trim().toLowerCase(),
          description: description.trim() || undefined,
          category: category.trim() || undefined,
          base_unit_id: baseUnitId,
          default_reporting_unit_id: defaultUnitId || baseUnitId,
          supported_units: supportedUnitsPayload,
        }).unwrap();
      }
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      setFormError(err.data?.message || err.message || "Failed to save production item.");
    }
  };

  const handleToggleActive = async (item: ProductionItem) => {
    try {
      await updateItem({
        id: item.production_item_id,
        data: { is_active: !item.is_active },
      }).unwrap();
      refetch();
    } catch (err: any) {
      alert(err.data?.message || err.message || "Failed to update item status.");
    }
  };

  if (isLoading) {
    return <Loading01 />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-800 via-emerald-800 to-cyan-900 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-white/20 p-2 backdrop-blur-sm">
                <Scale className="h-6 w-6 text-white" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight">Production Item Registry</h1>
            </div>
            <p className="mt-1 text-sm text-teal-100">
              Configure minerals, ores, and production commodities with compatible measurement units.
            </p>
          </div>
          <Button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Production Item
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border bg-card p-4 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items by name, code, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh list">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Items Table / Cards */}
      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center bg-card/50">
          <Scale className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-semibold">No production items found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || selectedCategory !== "all"
              ? "Try adjusting your search query or category filter."
              : "Create your first production item to configure company reporting."}
          </p>
          {!search && (
            <Button onClick={handleOpenCreate} className="mt-4 bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="h-4 w-4 mr-1.5" />
              Add First Item
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.production_item_id}
              className={`rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                !item.is_active ? "opacity-70 bg-muted/40" : ""
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                      {item.name}
                      <span className="text-xs px-2 py-0.5 rounded font-mono bg-muted text-muted-foreground">
                        {item.code}
                      </span>
                    </h3>
                    {item.category && (
                      <span className="inline-block mt-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <Badge variant={item.is_active ? "default" : "secondary"}>
                    {item.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {item.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2 mb-4">
                    {item.description}
                  </p>
                )}

                <div className="mt-4 pt-3 border-t space-y-2 text-xs">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Base Unit:</span>
                    <span className="font-semibold text-foreground">
                      {item.baseUnit?.name || "Standard"} ({item.baseUnit?.symbol || item.baseUnit?.code})
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Default Reporting Unit:</span>
                    <span className="font-semibold text-foreground">
                      {item.defaultReportingUnit?.name || item.baseUnit?.name || "Standard"}
                    </span>
                  </div>

                  <div className="pt-2">
                    <span className="text-muted-foreground block mb-1.5 font-medium">
                      Supported Units & Conversions:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.supportedUnits && item.supportedUnits.length > 0 ? (
                        item.supportedUnits.map((su) => (
                          <span
                            key={su.item_unit_id}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${
                              su.is_default
                                ? "bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300"
                                : "bg-muted/60 border-border text-foreground"
                            }`}
                            title={`1 ${su.measurementUnit?.symbol || su.measurementUnit?.name} = ${su.conversion_factor_to_base} ${item.baseUnit?.symbol}`}
                          >
                            <span className="font-semibold">
                              {su.measurementUnit?.name || su.measurementUnit?.symbol}
                            </span>
                            <span className="text-[10px] opacity-75">
                              ({su.conversion_factor_to_base}x)
                            </span>
                            {su.is_default && <span className="text-[10px] font-bold">★</span>}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-xs italic">
                          Base unit only ({item.baseUnit?.symbol})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(item)}
                  className="text-xs"
                >
                  {item.is_active ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenEdit(item)}
                  className="text-xs flex items-center gap-1"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit Item
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-card border shadow-2xl p-6 text-foreground animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-xl font-bold mb-1">
              {editingItem ? "Edit Production Item" : "Create Production Item"}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Configure production item specifications and allowed measurement units.
            </p>

            {formError && (
              <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Item Name *</label>
                  <Input
                    required
                    placeholder="e.g., Gold Concentrate"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Item Code *</label>
                  <Input
                    required
                    disabled={!!editingItem}
                    placeholder="e.g., gold_concentrate"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Category</label>
                  <Input
                    placeholder="e.g., Precious Metals, Base Minerals"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Base Unit (Internal Canonical) *</label>
                  <select
                    disabled={!!editingItem}
                    value={baseUnitId}
                    onChange={(e) => {
                      const newBase = e.target.value;
                      setBaseUnitId(newBase);
                      if (!defaultUnitId) setDefaultUnitId(newBase);
                      setSelectedUnits((prev) => ({
                        ...prev,
                        [newBase]: { factor: "1.0", isDefault: true },
                      }));
                    }}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select Base Unit</option>
                    {units.map((u: any) => (
                      <option key={u.unit_id} value={u.unit_id}>
                        {u.name} ({u.symbol || u.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  className="w-full rounded-md border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Optional item description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Supported Units Section */}
              <div className="pt-2 border-t">
                <label className="block text-xs font-semibold mb-1">
                  Supported Reporting Units & Conversion Factors to Base Unit
                </label>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Specify which units can be used when reporting this item and their factor to 1 base unit (e.g. 1 kg = 0.001 tonne).
                </p>

                <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3 bg-muted/20">
                  {units.map((u: any) => {
                    const isBase = u.unit_id === baseUnitId;
                    const isSelected = !!selectedUnits[u.unit_id] || isBase;
                    const factorVal = selectedUnits[u.unit_id]?.factor || (isBase ? "1.0" : "");

                    return (
                      <div
                        key={u.unit_id}
                        className={`flex items-center justify-between p-2 rounded-md border text-xs ${
                          isSelected ? "bg-card border-teal-300 dark:border-teal-700" : "opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            disabled={isBase}
                            checked={isSelected}
                            onChange={() => toggleUnitSelection(u.unit_id)}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                          <span className="font-medium">
                            {u.name} ({u.symbol || u.code})
                          </span>
                          {isBase && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1 text-teal-600">
                              Base
                            </Badge>
                          )}
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground">Factor to Base:</span>
                              <Input
                                type="number"
                                step="0.000001"
                                disabled={isBase}
                                value={factorVal}
                                onChange={(e) => handleFactorChange(u.unit_id, e.target.value)}
                                className="h-7 w-24 text-xs font-mono"
                              />
                            </div>
                            <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                              <input
                                type="radio"
                                name="defaultUnitRadio"
                                checked={defaultUnitId === u.unit_id}
                                onChange={() => setDefaultUnitId(u.unit_id)}
                              />
                              Default
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isCreating || isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={isCreating || isUpdating}
                >
                  {isCreating || isUpdating ? "Saving..." : editingItem ? "Update Item" : "Create Item"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
