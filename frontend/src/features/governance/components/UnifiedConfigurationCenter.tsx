"use client";

import { useMemo, useState } from "react";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function UnifiedConfigurationCenter() {
  const [activeTab, setActiveTab] = useState("definitions");
  const [isOpen, setIsOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [viewingDef, setViewingDef] = useState<ClinicalOrderDefinition | null>(null);
  const [editingDef, setEditingDef] = useState<ClinicalOrderDefinition | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

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

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    category: "DIAGNOSTIC",
    department_id: "",
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

  const handleBillingServiceSelect = (serviceId: string) => {
    const selected = billingServices.find((s: any) => (s.service_id || s.id) === serviceId);
    if (selected) {
      setFormData((f) => ({
        ...f,
        billing_service_id: serviceId,
        default_fee: Number(selected.unit_price || selected.price || selected.default_price || selected.fee || 50),
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
      department_id: "",
      request_form_config_id: "",
      result_form_config_id: "",
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
      department_id: def.department_id || "",
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
            <code className="text-[10px] text-indigo-600 font-mono">{row.original.code}</code>
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
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-[10px]">
            <FileText className="h-3 w-3 text-indigo-500 shrink-0" />
            <span className="truncate max-w-[120px]">
              {(row.original as any).requestFormConfig?.title || row.original.request_form_config_id || "Standard Intake"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "result_form_config_id",
        header: "Result Form",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-[10px]">
            <FileText className="h-3 w-3 text-purple-500 shrink-0" />
            <span className="truncate max-w-[120px]">
              {(row.original as any).resultFormConfig?.title || row.original.result_form_config_id || "Result Entry"}
            </span>
          </div>
        ),
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
              className="h-7 w-7 text-slate-600 hover:text-indigo-600"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Edit definition"
              onClick={() => openEditModal(row.original)}
              className="h-7 w-7 text-slate-600 hover:text-indigo-600"
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
    []
  );

  // TanStack Columns for Categories
  const categoryColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: "Category Code",
        cell: ({ row }) => (
          <span className="font-mono text-indigo-600 font-semibold">{row.original.code || "GENERAL"}</span>
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

  const handlePagination = (index: number, size: number) => {
    setPageIndex(index);
    setPageSize(size);
  };

  return (
    <>
      <TableLayout
        title="Unified Clinical Order Configuration & Governance"
        description="Configure dynamic clinical orders, categories, SLA turnaround targets, and billing catalog fees."
        actions={headerActions}
        filterColumnsPerRow={1}
      >
        {msg && (
          <div className="p-2.5 mb-3 border rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium">
            {msg}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 h-9 text-xs mb-3">
            <TabsTrigger value="definitions" className="py-1">Order Definitions ({orderDefs.length})</TabsTrigger>
            <TabsTrigger value="categories" className="py-1">Configured Categories ({categories.length})</TabsTrigger>
            <TabsTrigger value="form-templates" className="py-1">Form Templates ({formConfigs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="definitions" className="mt-0">
            <DataTable
              columns={definitionColumns}
              data={orderDefs}
              isLoading={isLoading}
              totalPageCount={1}
              handlePagination={handlePagination}
              tablePageSize={pageSize}
              currentIndex={pageIndex}
            />
          </TabsContent>

          <TabsContent value="categories" className="mt-0">
            <DataTable
              columns={categoryColumns}
              data={categories}
              isLoading={isLoading}
              totalPageCount={1}
              handlePagination={handlePagination}
              tablePageSize={pageSize}
              currentIndex={pageIndex}
            />
          </TabsContent>

          <TabsContent value="form-templates" className="mt-0">
            <DataTable
              columns={templateColumns}
              data={formConfigs}
              isLoading={isLoading}
              totalPageCount={1}
              handlePagination={handlePagination}
              tablePageSize={pageSize}
              currentIndex={pageIndex}
            />
          </TabsContent>
        </Tabs>
      </TableLayout>

      {/* View Definition Modal */}
      <Dialog open={Boolean(viewingDef)} onOpenChange={() => setViewingDef(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Eye className="h-4 w-4 text-indigo-600" />
              Order Definition Details
            </DialogTitle>
          </DialogHeader>
          {viewingDef && (
            <div className="space-y-3 text-xs pt-2">
              <div className="p-3 border rounded-lg bg-slate-50 space-y-1">
                <div className="font-bold text-sm text-slate-900">{viewingDef.name}</div>
                <div className="font-mono text-indigo-600 font-semibold">Code: {viewingDef.code}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>Category: <span className="font-semibold">{viewingDef.category}</span></div>
                <div>Department: <span className="font-semibold">{viewingDef.department_id}</span></div>
                <div>SLA Target: <span className="font-semibold">{(viewingDef as any).sla_config_json?.target_minutes || 60} minutes</span></div>
                <div>Catalog Fee: <span className="font-semibold">${(viewingDef as any).billing_configuration?.default_fee || "45.00"}</span></div>
              </div>
              <div className="p-2 border rounded text-muted-foreground text-[11px]">
                Status: <Badge variant="outline" className="ml-1">{viewingDef.status}</Badge> • Version: {viewingDef.version || "1.0.0"}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Category Creation Modal */}
      <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
              Configure Clinical Order Category
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-3 text-xs pt-2">
            <div className="space-y-1">
              <Label className="text-[11px]">Category Name</Label>
              <Input
                placeholder="e.g. Ophthalmology Diagnostics"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                required
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Category Code</Label>
              <Input
                placeholder="e.g. OPHTHALMOLOGY_DIAGNOSTICS"
                value={categoryFormData.code}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, code: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Description</Label>
              <Input
                placeholder="Optional description..."
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
            <Button type="submit" disabled={isCreatingCat} className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
              {isCreatingCat ? "Saving..." : "Save Configured Category"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Order Definition Create/Edit Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              {editingDef ? "Edit Order Definition" : "Configure Dynamic Clinical Order Definition"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateOrUpdate} className="space-y-3 text-xs pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">Order Code</Label>
                <Input
                  placeholder="e.g. DEF_CBC_ADVANCED"
                  value={formData.code}
                  disabled={Boolean(editingDef)}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Order Name</Label>
                <Input
                  placeholder="e.g. Full Hematology CBC Order"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">Configured Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.length > 0 ? (
                      categories.map((cat: any) => (
                        <SelectItem key={cat.category_id || cat.code || cat.name} value={(cat.code || cat.name).toUpperCase()}>
                          {cat.name || cat.category_name}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="DIAGNOSTIC">Diagnostic</SelectItem>
                        <SelectItem value="RADIOLOGY">Radiology</SelectItem>
                        <SelectItem value="THERAPEUTIC">Therapeutic</SelectItem>
                        <SelectItem value="LABORATORY">Laboratory</SelectItem>
                        <SelectItem value="OPHTHALMOLOGY">Ophthalmology</SelectItem>
                        <SelectItem value="PHYSIOTHERAPY">Physiotherapy</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Target Department (From Database)</Label>
                <Select
                  value={formData.department_id}
                  onValueChange={(val) => setFormData({ ...formData, department_id: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Department..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.length === 0 ? (
                      <SelectItem value="LABORATORY">Laboratory (Default)</SelectItem>
                    ) : (
                      departments.map((dept: any) => {
                        const value = dept.department_id || dept.code || dept.name;
                        const label = `${dept.name || dept.department_name} (${dept.code || dept.department_code || "DEPT"})`;
                        return (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">Linked Intake Request Form</Label>
                <Select
                  value={formData.request_form_config_id}
                  onValueChange={(val) => setFormData({ ...formData, request_form_config_id: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Dynamic Request Form..." />
                  </SelectTrigger>
                  <SelectContent>
                    {formConfigs.map((fc: DiagnosisFormConfig) => (
                      <SelectItem key={fc.config_id} value={fc.config_id}>
                        {fc.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Linked Result Entry Form</Label>
                <Select
                  value={formData.result_form_config_id}
                  onValueChange={(val) => setFormData({ ...formData, result_form_config_id: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Dynamic Result Entry Form..." />
                  </SelectTrigger>
                  <SelectContent>
                    {formConfigs.map((fc: DiagnosisFormConfig) => (
                      <SelectItem key={fc.config_id} value={fc.config_id}>
                        {fc.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">Linked Billing Service Fee (Billing Catalog)</Label>
              <Select
                value={formData.billing_service_id}
                onValueChange={handleBillingServiceSelect}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select Billing Service Catalog Fee..." />
                </SelectTrigger>
                <SelectContent>
                  {billingServices.map((bs: any) => {
                    const bsId = bs.service_id || bs.id;
                    const fee = bs.unit_price || bs.price || bs.default_price || bs.fee || 0;
                    return (
                      <SelectItem key={bsId} value={bsId}>
                        {bs.name || bs.service_name} — ${fee} ({bs.code || "SERVICE"})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">Turnaround SLA (Minutes)</Label>
                <Input
                  type="number"
                  value={formData.sla_minutes}
                  onChange={(e) => setFormData({ ...formData, sla_minutes: Number(e.target.value) })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Catalog Fee ($)</Label>
                <Input
                  type="number"
                  value={formData.default_fee}
                  disabled={Boolean(formData.billing_service_id)}
                  onChange={(e) => setFormData({ ...formData, default_fee: Number(e.target.value) })}
                  className="h-8 text-xs bg-slate-50 font-semibold"
                />
                {formData.billing_service_id && (
                  <p className="text-[10px] text-emerald-600 font-medium pt-0.5">
                    ✓ Fee auto-populated from linked Service Fee Catalog.
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isCreating}
              className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isCreating ? "Saving..." : editingDef ? "Save Changes" : "Create & Publish Order Definition"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
