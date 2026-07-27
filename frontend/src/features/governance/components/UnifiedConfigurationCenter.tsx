"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  CheckCircle2,
  Building2,
  Receipt,
  FileText,
  Clock,
  Sparkles,
  SlidersHorizontal,
  Pencil,
  Eye,
  Search,
  Check,
  ChevronDown,
} from "lucide-react";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionButton } from "@/types/tableLayout";
import {
  useGetOrderDefinitionsQuery,
  useCreateOrderDefinitionMutation,
  usePublishOrderDefinitionMutation,
  type ClinicalOrderDefinition,
} from "@/redux/api/clinicalOrderDefinitionApi";
import {
  useListDiagnosisFormConfigsQuery,
  type DiagnosisFormConfig,
} from "@/redux/api/diagnosisFormApi";
import { useGetDepartmentsQuery } from "@/redux/api/departmentApi";
import {
  useListActiveBillingServicesQuery,
  useListBillingServiceCategoriesQuery,
  useCreateBillingServiceCategoryMutation,
} from "@/redux/api/billingServiceApi";

/**
 * Searchable Inline Picker Component
 * Replaces standard overlays with clean inline search & select lists matching system design tokens
 */
function SearchablePicker({
  label,
  searchPlaceholder,
  items,
  selectedId,
  onSelect,
  emptyText = "No matching items found.",
}: {
  label: string;
  searchPlaceholder: string;
  items: Array<{ id: string; title: string; subtitle?: string; badge?: string }>;
  selectedId: string;
  onSelect: (id: string) => void;
  emptyText?: string;
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);

  const selectedItem = items.find((i) => i.id === selectedId);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.subtitle && i.subtitle.toLowerCase().includes(q)) ||
        (i.badge && i.badge.toLowerCase().includes(q))
    );
  }, [items, search]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-slate-700">{label}</Label>
        {selectedItem && (
          <span className="text-[11px] font-bold text-section-accent truncate max-w-[220px]">
            Selected: {selectedItem.title}
          </span>
        )}
      </div>

      <div className="border border-gray-300 rounded-lg bg-white overflow-hidden shadow-sm">
        {/* Active Header Trigger */}
        <div
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center space-x-2 truncate">
            {selectedItem ? (
              <>
                <span className="font-semibold text-sm text-slate-900 truncate">{selectedItem.title}</span>
                {selectedItem.badge && (
                  <Badge variant="secondary" className="text-[10px] shrink-0 font-mono">
                    {selectedItem.badge}
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-sm text-gray-400">Click to search and select...</span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>

        {/* Expandable Searchable List Box */}
        {expanded && (
          <div className="p-2 border-t bg-slate-50 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs bg-white border-gray-300 focus:ring-section-accent focus:border-section-accent"
                autoFocus
              />
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
              {filtered.length === 0 ? (
                <div className="py-3 text-center text-xs text-gray-400">{emptyText}</div>
              ) : (
                filtered.map((item) => {
                  const isSelected = item.id === selectedId;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        onSelect(item.id);
                        setExpanded(false);
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-primary/10 border-primary text-primary font-semibold"
                          : "bg-white border-gray-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <div
                          className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-primary border-primary text-primary-foreground" : "border-gray-300"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span className="truncate font-medium">{item.title}</span>
                        {item.subtitle && <span className="text-[10px] text-gray-400 truncate">({item.subtitle})</span>}
                      </div>
                      {item.badge && (
                        <Badge variant="outline" className="text-[9px] shrink-0">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function UnifiedConfigurationCenter() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const [activeTab, setActiveTab] = useState("definitions");
  const [isOpen, setIsOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [viewingDef, setViewingDef] = useState<ClinicalOrderDefinition | null>(null);
  const [editingDef, setEditingDef] = useState<ClinicalOrderDefinition | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Pagination states matching UserTable / TableLayout pattern
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { data: rawOrderDefs = [], isLoading, refetch: refetchDefs } = useGetOrderDefinitionsQuery();
  const { data: rawFormConfigs = [] } = useListDiagnosisFormConfigsQuery();
  const { data: rawDepartments = [] } = useGetDepartmentsQuery();
  const { data: rawBillingServices = [] } = useListActiveBillingServicesQuery();
  const { data: rawCategories = [], refetch: refetchCategories } = useListBillingServiceCategoriesQuery();

  const orderDefs = Array.isArray(rawOrderDefs) ? rawOrderDefs : (rawOrderDefs as any)?.data || [];
  const formConfigs = Array.isArray(rawFormConfigs) ? rawFormConfigs : (rawFormConfigs as any)?.data || [];
  const departments = Array.isArray(rawDepartments) ? rawDepartments : (rawDepartments as any)?.data || [];
  const billingServices = Array.isArray(rawBillingServices) ? rawBillingServices : (rawBillingServices as any)?.data || [];
  const categories = Array.isArray(rawCategories) ? rawCategories : (rawCategories as any)?.data || [];

  const [createOrderDefinition, { isLoading: isCreating }] = useCreateOrderDefinitionMutation();
  const [publishOrderDefinition] = usePublishOrderDefinitionMutation();
  const [createCategory, { isLoading: isCreatingCat }] = useCreateBillingServiceCategoryMutation();

  // Reset pagination index when search query or active tab changes
  useEffect(() => {
    setPageIndex(0);
  }, [searchQuery, activeTab]);

  const handlePagination = (index: number, size: number) => {
    setPageIndex(index);
    setPageSize(size);
  };

  // Order Definitions filtering and pagination
  const filteredOrderDefs = useMemo(() => {
    if (!searchQuery.trim()) return orderDefs;
    const q = searchQuery.toLowerCase();
    return orderDefs.filter((def: ClinicalOrderDefinition) =>
      def.name.toLowerCase().includes(q) ||
      def.code.toLowerCase().includes(q) ||
      (def.category && def.category.toLowerCase().includes(q)) ||
      (def.department_id && def.department_id.toLowerCase().includes(q))
    );
  }, [orderDefs, searchQuery]);

  const orderDefsPageCount = Math.max(1, Math.ceil(filteredOrderDefs.length / pageSize));
  const paginatedOrderDefs = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredOrderDefs.slice(start, start + pageSize);
  }, [filteredOrderDefs, pageIndex, pageSize]);

  // Categories filtering and pagination
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter((c: any) =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.code && c.code.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  const categoriesPageCount = Math.max(1, Math.ceil(filteredCategories.length / pageSize));
  const paginatedCategories = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredCategories.slice(start, start + pageSize);
  }, [filteredCategories, pageIndex, pageSize]);

  // Form Templates filtering and pagination
  const filteredFormConfigs = useMemo(() => {
    if (!searchQuery.trim()) return formConfigs;
    const q = searchQuery.toLowerCase();
    return formConfigs.filter((fc: DiagnosisFormConfig) =>
      fc.title.toLowerCase().includes(q) ||
      fc.config_id.toLowerCase().includes(q)
    );
  }, [formConfigs, searchQuery]);

  const formConfigsPageCount = Math.max(1, Math.ceil(filteredFormConfigs.length / pageSize));
  const paginatedFormConfigs = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredFormConfigs.slice(start, start + pageSize);
  }, [filteredFormConfigs, pageIndex, pageSize]);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    category: "DIAGNOSTIC",
    department_id: "LABORATORY",
    request_form_config_id: "",
    result_form_config_id: "",
    sla_minutes: 60,
    billing_service_id: "",
    default_fee: 50,
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    code: "",
    description: "",
  });

  // SearchablePicker Item Collections
  const categoryItems = useMemo(() => {
    if (categories.length === 0) {
      return [
        { id: "DIAGNOSTIC", title: "Diagnostic", badge: "DIAG" },
        { id: "RADIOLOGY", title: "Radiology", badge: "RAD" },
        { id: "THERAPEUTIC", title: "Therapeutic", badge: "THER" },
        { id: "LABORATORY", title: "Laboratory", badge: "LAB" },
        { id: "OPHTHALMOLOGY", title: "Ophthalmology", badge: "OPHTH" },
        { id: "PHYSIOTHERAPY", title: "Physiotherapy", badge: "PHYS" },
      ];
    }
    return categories.map((c: any) => {
      const code = (c.code || c.name).toUpperCase();
      return {
        id: code,
        title: c.name || c.category_name,
        badge: code,
      };
    });
  }, [categories]);

  const departmentItems = useMemo(() => {
    if (departments.length === 0) {
      return [{ id: "LABORATORY", title: "Laboratory", badge: "DEPT" }];
    }
    return departments.map((d: any) => ({
      id: d.department_id || d.code || d.name,
      title: d.name || d.department_name,
      badge: d.code || d.department_code || "DEPT",
    }));
  }, [departments]);

  const formConfigItems = useMemo(() => {
    return formConfigs.map((fc: DiagnosisFormConfig) => ({
      id: fc.config_id,
      title: fc.title,
      badge: "FORM",
    }));
  }, [formConfigs]);

  const billingServiceItems = useMemo(() => {
    return billingServices.map((bs: any) => {
      const fee = bs.unit_price || bs.price || bs.default_price || bs.fee || 0;
      return {
        id: bs.service_id || bs.id,
        title: bs.name || bs.service_name,
        subtitle: bs.code || "SERVICE",
        badge: `$${fee}`,
      };
    });
  }, [billingServices]);

  const handleSelectBillingService = (serviceId: string) => {
    const selected = billingServices.find((s: any) => (s.service_id || s.id) === serviceId);
    if (selected) {
      const fee = Number(selected.unit_price || selected.price || selected.default_price || selected.fee || 50);
      setFormData((f) => ({
        ...f,
        billing_service_id: serviceId,
        default_fee: fee,
      }));
    } else {
      setFormData((f) => ({ ...f, billing_service_id: serviceId }));
    }
  };

  const openCreateModal = () => {
    setEditingDef(null);
    setFormData({
      code: "",
      name: "",
      category: "DIAGNOSTIC",
      department_id: departments[0]?.department_id || "LABORATORY",
      request_form_config_id: formConfigs[0]?.config_id || "",
      result_form_config_id: formConfigs[0]?.config_id || "",
      sla_minutes: 60,
      billing_service_id: "",
      default_fee: 50,
    });
    setIsOpen(true);
  };

  const openEditModal = (def: ClinicalOrderDefinition) => {
    setEditingDef(def);
    const billingConf = def.billing_configuration || {};
    const slaConf = def.sla_config_json || {};

    setFormData({
      code: def.code,
      name: def.name,
      category: def.category || "DIAGNOSTIC",
      department_id: def.department_id || "LABORATORY",
      request_form_config_id: def.request_form_config_id || "",
      result_form_config_id: def.result_form_config_id || "",
      sla_minutes: slaConf.target_minutes || 60,
      billing_service_id: billingConf.billing_service_id || "",
      default_fee: billingConf.default_fee || 50,
    });
    setIsOpen(true);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedService = billingServices.find(
        (s: any) => (s.service_id || s.id) === formData.billing_service_id
      );

      const feeToUse = selectedService
        ? Number(selectedService.unit_price || selectedService.price || selectedService.fee || 50)
        : Number(formData.default_fee);

      const saved = await createOrderDefinition({
        code: formData.code.toUpperCase().trim(),
        name: formData.name.trim(),
        category: formData.category,
        department_id: formData.department_id || "LABORATORY",
        request_form_config_id: formData.request_form_config_id || undefined,
        result_form_config_id: formData.result_form_config_id || undefined,
        sla_config_json: { target_minutes: Number(formData.sla_minutes) },
        billing_configuration: {
          is_billable: true,
          billing_service_id: formData.billing_service_id || undefined,
          service_code: selectedService?.code || selectedService?.service_code || undefined,
          default_fee: feeToUse,
          percentage_markup: selectedService?.percentage_markup || selectedService?.tax_percent || selectedService?.tax_rate || 0,
        },
        status: editingDef?.status || "PUBLISHED",
      }).unwrap();

      setMsg(`Order definition '${saved.name}' ${editingDef ? "updated" : "created and published"}!`);
      setIsOpen(false);
      setEditingDef(null);
      refetchDefs();
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg(`Failed to save order definition: ${err?.data?.message || err?.message}`);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCategory({
        name: categoryFormData.name.trim(),
        code: categoryFormData.code.toUpperCase().trim() || categoryFormData.name.toUpperCase().replace(/\s+/g, "_"),
        description: categoryFormData.description.trim() || undefined,
      }).unwrap();

      setMsg(`Order Category '${categoryFormData.name}' configured successfully!`);
      setIsCategoryOpen(false);
      setCategoryFormData({ name: "", code: "", description: "" });
      refetchCategories();
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg(`Failed to configure category: ${err?.data?.message || err?.message}`);
    }
  };

  const handlePublish = async (idOrCode: string) => {
    try {
      await publishOrderDefinition(idOrCode).unwrap();
      setMsg(`Order definition published successfully!`);
      refetchDefs();
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg(`Publish failed: ${err?.message}`);
    }
  };

  // TanStack Columns for Order Definitions
  const definitionColumns: ColumnDef<ClinicalOrderDefinition>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Order Code & Name",
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-primary">{row.original.name}</div>
            <code className="text-[10px] text-section-accent font-mono">{row.original.code}</code>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <Badge variant="outline" className="text-[9px] uppercase">
            {row.original.category || "GENERAL"}
          </Badge>
        ),
      },
      {
        accessorKey: "department_id",
        header: "Department",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 font-medium">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            <span>{row.original.department_id || "LABORATORY"}</span>
          </div>
        ),
      },
      {
        accessorKey: "request_form_config_id",
        header: "Request Form",
        cell: ({ row }) => {
          const reqFormTitle =
            formConfigs.find((fc: DiagnosisFormConfig) => fc.config_id === row.original.request_form_config_id)?.title ||
            (row.original as any).requestFormConfig?.title ||
            "Standard Intake Form";
          return (
            <div className="flex items-center gap-1 text-[10px]">
              <FileText className="h-3 w-3 text-section-accent shrink-0" />
              <span className="font-medium text-slate-800 truncate max-w-[130px]" title={reqFormTitle}>
                {reqFormTitle}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "result_form_config_id",
        header: "Result Form",
        cell: ({ row }) => {
          const resFormTitle =
            formConfigs.find((fc: DiagnosisFormConfig) => fc.config_id === row.original.result_form_config_id)?.title ||
            (row.original as any).resultFormConfig?.title ||
            "Standard Result Entry";
          return (
            <div className="flex items-center gap-1 text-[10px]">
              <FileText className="h-3 w-3 text-purple-600 shrink-0" />
              <span className="font-medium text-slate-800 truncate max-w-[130px]" title={resFormTitle}>
                {resFormTitle}
              </span>
            </div>
          );
        },
      },
      {
        id: "sla",
        header: "SLA Target",
        cell: ({ row }) => {
          const sla = (row.original as any).sla_config_json?.target_minutes || 60;
          return (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-500" />
              <span>{sla}m</span>
            </div>
          );
        },
      },
      {
        id: "fee",
        header: "Catalog Fee",
        cell: ({ row }) => {
          const billingConf = (row.original as any).billing_configuration || {};
          return (
            <div className="flex items-center gap-1 font-medium text-emerald-600">
              <Receipt className="h-3 w-3 text-emerald-500" />
              <span>${billingConf.default_fee || "45.00"}</span>
              {billingConf.service_code && (
                <Badge variant="secondary" className="text-[8px] font-mono ml-1">{billingConf.service_code}</Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge className={`text-[9px] ${row.original.status === "PUBLISHED" ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}`}>
            {row.original.status || "DRAFT"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              title="View definition details"
              onClick={() => setViewingDef(row.original)}
              className="h-7 w-7 text-slate-600 hover:text-section-accent"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Edit definition"
              onClick={() => openEditModal(row.original)}
              className="h-7 w-7 text-slate-600 hover:text-section-accent"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {row.original.status !== "PUBLISHED" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handlePublish(row.original.definition_id || row.original.code)}
                className="h-6 text-[10px] px-1.5 text-emerald-600 hover:bg-emerald-50"
              >
                Publish
              </Button>
            )}
          </div>
        ),
      },
    ],
    [formConfigs]
  );

  // TanStack Columns for Categories
  const categoryColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: "Category Code",
        cell: ({ row }) => (
          <span className="font-mono text-section-accent font-semibold">{row.original.code || "GENERAL"}</span>
        ),
      },
      {
        accessorKey: "name",
        header: "Category Name",
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.description || "Configured Order Category"}</span>
        ),
      },
      {
        id: "status",
        header: () => <div className="text-right">Status</div>,
        cell: () => (
          <div className="text-right">
            <Badge className="bg-emerald-600 text-white text-[9px]">ACTIVE</Badge>
          </div>
        ),
      },
    ],
    []
  );

  // TanStack Columns for Form Templates
  const templateColumns: ColumnDef<DiagnosisFormConfig>[] = useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Form Title",
        cell: ({ row }) => <span className="font-semibold text-primary">{row.original.title}</span>,
      },
      {
        accessorKey: "config_id",
        header: "Form Config ID",
        cell: ({ row }) => <code className="font-mono text-xs text-muted-foreground">{row.original.config_id}</code>,
      },
      {
        id: "status",
        header: "Status",
        cell: () => <Badge variant="outline" className="text-[9px]">ACTIVE TEMPLATE</Badge>,
      },
      {
        id: "actions",
        header: () => <div className="text-right">Linkage</div>,
        cell: () => (
          <div className="text-right">
            <Badge variant="secondary" className="text-[9px]">LINKED</Badge>
          </div>
        ),
      },
    ],
    []
  );

  const headerActions: ActionButton[] = [
    {
      label: "New Category",
      icon: <Plus className="h-4 w-4" />,
      variant: "outline",
      onClick: () => setIsCategoryOpen(true),
    },
    {
      label: "New Order Definition",
      icon: <Plus className="h-4 w-4" />,
      variant: "default",
      onClick: openCreateModal,
    },
  ];

  return (
    <>
      <TableLayout
        title="Unified Clinical Order Configuration & Governance"
        description="Configure dynamic clinical orders, categories, SLA turnaround targets, and billing catalog fees."
        actions={headerActions}
        filterColumnsPerRow={1}
      >
        {msg && (
          <div className="p-2.5 mb-3 border rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium border-emerald-200">
            {msg}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 h-9 text-xs mb-3">
            <TabsTrigger value="definitions" className="py-1">Order Definitions ({filteredOrderDefs.length})</TabsTrigger>
            <TabsTrigger value="categories" className="py-1">Configured Categories ({filteredCategories.length})</TabsTrigger>
            <TabsTrigger value="form-templates" className="py-1">Form Templates ({filteredFormConfigs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="definitions" className="mt-0">
            <DataTable
              columns={definitionColumns}
              data={paginatedOrderDefs}
              isLoading={isLoading}
              totalPageCount={orderDefsPageCount}
              handlePagination={handlePagination}
              tablePageSize={pageSize}
              currentIndex={pageIndex}
            />
          </TabsContent>

          <TabsContent value="categories" className="mt-0">
            <DataTable
              columns={categoryColumns}
              data={paginatedCategories}
              isLoading={isLoading}
              totalPageCount={categoriesPageCount}
              handlePagination={handlePagination}
              tablePageSize={pageSize}
              currentIndex={pageIndex}
            />
          </TabsContent>

          <TabsContent value="form-templates" className="mt-0">
            <DataTable
              columns={templateColumns}
              data={paginatedFormConfigs}
              isLoading={isLoading}
              totalPageCount={formConfigsPageCount}
              handlePagination={handlePagination}
              tablePageSize={pageSize}
              currentIndex={pageIndex}
            />
          </TabsContent>
        </Tabs>
      </TableLayout>

      {/* View Definition Modal */}
      <Dialog open={Boolean(viewingDef)} onOpenChange={() => setViewingDef(null)}>
        <DialogContent className="flex max-w-lg flex-col overflow-hidden bg-white max-h-[85vh] sm:max-h-[90vh]">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-section-accent text-xl font-bold flex items-center gap-2">
              <Eye className="h-5 w-5 text-section-accent" />
              Order Definition Details
            </DialogTitle>
          </DialogHeader>
          {viewingDef && (
            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 min-h-0 text-sm">
              <div className="p-3 border rounded-lg bg-slate-50 space-y-1">
                <div className="font-bold text-base text-slate-900">{viewingDef.name}</div>
                <div className="font-mono text-section-accent font-semibold">Code: {viewingDef.code}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-slate-700">
                <div>Category: <span className="font-semibold block text-slate-900">{viewingDef.category}</span></div>
                <div>Department: <span className="font-semibold block text-slate-900">{viewingDef.department_id}</span></div>
                <div>
                  Intake Request Form:{" "}
                  <span className="font-semibold block text-slate-900">
                    {formConfigs.find((fc: DiagnosisFormConfig) => fc.config_id === viewingDef.request_form_config_id)?.title || "Standard Intake Form"}
                  </span>
                </div>
                <div>
                  Result Entry Form:{" "}
                  <span className="font-semibold block text-slate-900">
                    {formConfigs.find((fc: DiagnosisFormConfig) => fc.config_id === viewingDef.result_form_config_id)?.title || "Standard Result Form"}
                  </span>
                </div>
                <div>SLA Target: <span className="font-semibold block text-slate-900">{(viewingDef as any).sla_config_json?.target_minutes || 60} minutes</span></div>
                <div>Catalog Fee: <span className="font-semibold block text-slate-900">${(viewingDef as any).billing_configuration?.default_fee || "45.00"}</span></div>
              </div>
              <div className="p-2.5 border rounded-lg text-muted-foreground text-xs bg-slate-50">
                Status: <Badge variant="outline" className="ml-1">{viewingDef.status}</Badge> • Version: {viewingDef.version || "1.0.0"}
              </div>
            </div>
          )}
          <DialogFooter className="pt-3 border-t mt-auto">
            <Button variant="outline" onClick={() => setViewingDef(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Creation Modal */}
      <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
        <DialogContent className="flex max-w-lg flex-col overflow-hidden bg-white max-h-[85vh] sm:max-h-[90vh]">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-section-accent text-xl font-bold flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-section-accent" />
              Configure Clinical Order Category
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Category Name</Label>
                <Input
                  placeholder="e.g. Ophthalmology Diagnostics"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  required
                  className="h-10 text-sm border-gray-300 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-section-accent"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Category Code</Label>
                <Input
                  placeholder="e.g. OPHTHALMOLOGY_DIAGNOSTICS"
                  value={categoryFormData.code}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, code: e.target.value })}
                  className="h-10 text-sm font-mono border-gray-300 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-section-accent"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Description</Label>
                <Input
                  placeholder="Optional description..."
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  className="h-10 text-sm border-gray-300 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-section-accent"
                />
              </div>
            </div>
            <DialogFooter className="pt-3 border-t mt-auto gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCategoryOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingCat} className="h-10 text-sm font-semibold bg-section-accent hover:bg-section-accent/90 text-white rounded-lg shadow-sm">
                {isCreatingCat ? "Saving..." : "Save Configured Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Order Definition Create/Edit Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="flex max-w-2xl flex-col overflow-hidden bg-white max-h-[85vh] sm:max-h-[90vh]">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-section-accent text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-section-accent" />
              {editingDef ? "Edit Order Definition" : "Configure Dynamic Clinical Order Definition"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateOrUpdate} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 min-h-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Order Code</Label>
                  <Input
                    placeholder="e.g. DEF_CBC_ADVANCED"
                    value={formData.code}
                    disabled={Boolean(editingDef)}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                    className="h-10 text-sm font-mono border-gray-300 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-section-accent"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Order Name</Label>
                  <Input
                    placeholder="e.g. Full Hematology CBC Order"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="h-10 text-sm border-gray-300 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-section-accent"
                  />
                </div>
              </div>

              {/* SEARCHABLE CATEGORY PICKER */}
              <SearchablePicker
                label="Configured Category"
                searchPlaceholder="Search categories..."
                items={categoryItems}
                selectedId={formData.category}
                onSelect={(id) => setFormData((f) => ({ ...f, category: id }))}
              />

              {/* SEARCHABLE DEPARTMENT PICKER */}
              <SearchablePicker
                label="Target Department (From Database)"
                searchPlaceholder="Search database departments..."
                items={departmentItems}
                selectedId={formData.department_id}
                onSelect={(id) => setFormData((f) => ({ ...f, department_id: id }))}
              />

              {/* SEARCHABLE INTAKE REQUEST FORM PICKER (Displays Form Name) */}
              <SearchablePicker
                label="Linked Intake Request Form"
                searchPlaceholder="Search dynamic intake forms by name..."
                items={formConfigItems}
                selectedId={formData.request_form_config_id}
                onSelect={(id) => setFormData((f) => ({ ...f, request_form_config_id: id }))}
                emptyText="No dynamic intake forms found."
              />

              {/* SEARCHABLE RESULT ENTRY FORM PICKER (Displays Form Name) */}
              <SearchablePicker
                label="Linked Result Entry Form"
                searchPlaceholder="Search dynamic result entry forms by name..."
                items={formConfigItems}
                selectedId={formData.result_form_config_id}
                onSelect={(id) => setFormData((f) => ({ ...f, result_form_config_id: id }))}
                emptyText="No dynamic result entry forms found."
              />

              {/* SEARCHABLE BILLING SERVICE CATALOG FEE PICKER */}
              <SearchablePicker
                label="Linked Billing Service Fee (Billing Catalog)"
                searchPlaceholder="Search billing services by name or code..."
                items={billingServiceItems}
                selectedId={formData.billing_service_id}
                onSelect={handleSelectBillingService}
                emptyText="No billing catalog services found."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Turnaround SLA (Minutes)</Label>
                  <Input
                    type="number"
                    value={formData.sla_minutes}
                    onChange={(e) => setFormData({ ...formData, sla_minutes: Number(e.target.value) })}
                    className="h-10 text-sm border-gray-300 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-section-accent"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Catalog Fee ($)</Label>
                  <Input
                    type="number"
                    value={formData.default_fee}
                    disabled={Boolean(formData.billing_service_id)}
                    onChange={(e) => setFormData({ ...formData, default_fee: Number(e.target.value) })}
                    className="h-10 text-sm font-semibold border-gray-300 rounded-lg bg-slate-50 text-gray-900 shadow-sm focus:ring-2 focus:ring-section-accent"
                  />
                  {formData.billing_service_id && (
                    <p className="text-xs text-emerald-600 font-medium pt-0.5">
                      ✓ Fee auto-populated from linked Service Fee Catalog.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t mt-auto gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="h-10 text-sm font-semibold bg-section-accent hover:bg-section-accent/90 text-white rounded-lg shadow-sm"
              >
                {isCreating ? "Saving..." : editingDef ? "Save Changes" : "Create & Publish Order Definition"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
