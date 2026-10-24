"use client";

import { useState, useMemo } from "react";
import {
  Scale,
  Plus,
  Edit,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import type { ActionButton, FilterField } from "@/types/tableLayout";
import { useSearchParams } from "next/navigation";
import {
  matchesActiveInactiveFilter,
  matchesSearchQuery,
} from "@/utils/tableUtils";

import {
  useGetProductionItemsQuery,
  useCreateProductionItemMutation,
  useUpdateProductionItemMutation,
  useGetMeasurementUnitsQuery,
} from "@/redux/api/productionApi";
import type { ProductionItem } from "@/redux/types/production";

export function ProductionItemsView() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("");
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

  const { data: items = [], isLoading, isError, refetch } = useGetProductionItemsQuery();
  const { data: units = [] } = useGetMeasurementUnitsQuery();
  const [createItem, { isLoading: isCreating }] = useCreateProductionItemMutation();
  const [updateItem, { isLoading: isUpdating }] = useUpdateProductionItemMutation();

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (!matchesActiveInactiveFilter(statusFilter, i.is_active)) return false;
      const matchesCat = selectedCategory === "all" || i.category === selectedCategory;
      if (!matchesCat) return false;
      return matchesSearchQuery(searchQuery, [i.name, i.code, i.category || "", i.description || ""]);
    });
  }, [items, searchQuery, selectedCategory, statusFilter]);

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

  const columns: ColumnDef<ProductionItem>[] = [
    {
      accessorKey: "name",
      header: "Item Name",
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-foreground flex items-center gap-2">
            <Scale className="h-4 w-4 text-teal-600 shrink-0" />
            <span>{row.original.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-muted text-muted-foreground">
              {row.original.code}
            </span>
          </div>
          {row.original.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {row.original.description}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) =>
        row.original.category ? (
          <Badge
            variant="outline"
            className="text-xs bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border-teal-200 dark:border-teal-800"
          >
            {row.original.category}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      id: "baseUnit",
      header: "Base Unit",
      cell: ({ row }) => (
        <div className="text-xs font-medium text-foreground">
          {row.original.baseUnit?.name || "Standard"}{" "}
          <span className="text-muted-foreground">
            ({row.original.baseUnit?.symbol || row.original.baseUnit?.code || ""})
          </span>
        </div>
      ),
    },
    {
      id: "defaultReportingUnit",
      header: "Default Reporting Unit",
      cell: ({ row }) => (
        <div className="text-xs font-medium text-foreground">
          {row.original.defaultReportingUnit?.name || row.original.baseUnit?.name || "Standard"}{" "}
          <span className="text-muted-foreground">
            ({row.original.defaultReportingUnit?.symbol || row.original.baseUnit?.symbol || ""})
          </span>
        </div>
      ),
    },
    {
      id: "supportedUnits",
      header: "Supported Units & Conversions",
      cell: ({ row }) => {
        const supported = row.original.supportedUnits || [];
        if (supported.length === 0) {
          return (
            <span className="text-xs text-muted-foreground italic">
              Base unit only ({row.original.baseUnit?.symbol || ""})
            </span>
          );
        }
        return (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {supported.map((su) => (
              <span
                key={su.item_unit_id}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] border bg-muted/40"
                title={`1 ${su.measurementUnit?.name} = ${su.conversion_factor_to_base} base`}
              >
                <span className="font-medium text-foreground">
                  {su.measurementUnit?.symbol || su.measurementUnit?.name}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  ({su.conversion_factor_to_base}x)
                </span>
                {su.is_default && <span className="text-[10px] text-amber-500 font-bold">★</span>}
              </span>
            ))}
          </div>
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
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(row.original)}
            className="h-8 px-2 text-xs flex items-center gap-1"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleActive(row.original)}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {row.original.is_active ? "Deactivate" : "Activate"}
          </Button>
        </div>
      ),
    },
  ];

  const filters: FilterField[] = [
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      placeholder: "Select status",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
    ...(categories.length > 0
      ? [
          {
            key: "category",
            label: "Category",
            type: "select" as const,
            placeholder: "All Categories",
            value: selectedCategory,
            onChange: setSelectedCategory,
            options: [
              { label: "All Categories", value: "all" },
              ...categories.map((c) => ({ label: c, value: c })),
            ],
          },
        ]
      : []),
  ];

  const actions: ActionButton[] = [
    {
      label: "Add Production Item",
      icon: <Plus className="h-4 w-4" />,
      variant: "default",
      onClick: handleOpenCreate,
    },
  ];

  return (
    <>
      <TableLayout
        title="Production Item Registry"
        description="Configure minerals, ores, and production commodities with compatible measurement units."
        actions={actions}
        filters={filters}
        filterColumnsPerRow={categories.length > 0 ? 2 : 1}
      >
        <DataTable
          columns={columns}
          data={filteredItems}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load production items."
          onRetry={refetch}
          resetKey={`${searchQuery}-${statusFilter}-${selectedCategory}`}
        />
      </TableLayout>

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
    </>
  );
}
