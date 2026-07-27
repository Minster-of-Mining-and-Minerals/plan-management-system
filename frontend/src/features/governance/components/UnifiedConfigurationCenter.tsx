"use client";

import { useState } from "react";
import {
  Layers,
  FileText,
  Clock,
  Plus,
  CheckCircle2,
  Building2,
  Receipt,
  Sparkles,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

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
      setFormData({
        ...formData,
        billing_service_id: serviceId,
        default_fee: Number(selected.unit_price || selected.price || selected.default_price || selected.fee || 50),
      });
    } else {
      setFormData({ ...formData, billing_service_id: serviceId });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedService = billingServices.find(
        (s: any) => (s.service_id || s.id) === formData.billing_service_id
      );

      const created = await createOrderDefinition({
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
          default_fee: Number(formData.default_fee),
          percentage_markup: selectedService?.percentage_markup || selectedService?.tax_rate || 0,
        },
        status: "PUBLISHED",
      }).unwrap();

      setMsg(`Order definition '${created.name}' created and published!`);
      setIsOpen(false);
      refetchDefs();
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg(`Failed to create order definition: ${err?.data?.message || err?.message}`);
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

  const filteredOrderDefs = orderDefs.filter((def: ClinicalOrderDefinition) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      def.name.toLowerCase().includes(q) ||
      def.code.toLowerCase().includes(q) ||
      (def.category && def.category.toLowerCase().includes(q)) ||
      (def.department_id && def.department_id.toLowerCase().includes(q))
    );
  });

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <CardTitle className="text-sm font-semibold">
              Unified Clinical Configuration & Category Governance
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="text-[9px] bg-indigo-600 text-white">
              Dynamic Configurable
            </Badge>

            {/* Category Modal */}
            <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Configure Category
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px]">
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

            {/* Order Definition Modal */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  New Order Definition
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle className="text-sm font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    Configure Dynamic Clinical Order Definition
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-3 text-xs pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Order Code</Label>
                      <Input
                        placeholder="e.g. DEF_CBC_ADVANCED"
                        value={formData.code}
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
                      <Label className="text-[11px]">Base Fee ($)</Label>
                      <Input
                        type="number"
                        value={formData.default_fee}
                        onChange={(e) => setFormData({ ...formData, default_fee: Number(e.target.value) })}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isCreating}
                    className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {isCreating ? "Saving..." : "Create & Publish Order Definition"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-3">
        {msg && (
          <div className="p-2 border rounded bg-indigo-50 text-indigo-700 text-[11px] font-medium">
            {msg}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search definitions, categories, codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 h-8 text-[11px] mb-3">
            <TabsTrigger value="definitions" className="py-1">Order Definitions ({filteredOrderDefs.length})</TabsTrigger>
            <TabsTrigger value="categories" className="py-1">Configured Categories ({categories.length})</TabsTrigger>
            <TabsTrigger value="form-templates" className="py-1">Form Templates ({formConfigs.length})</TabsTrigger>
            <TabsTrigger value="governance" className="py-1">Governance</TabsTrigger>
          </TabsList>

          {/* TABULAR ORDER DEFINITIONS VIEW */}
          <TabsContent value="definitions" className="space-y-2 mt-0">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground animate-pulse">Loading order definitions...</div>
            ) : filteredOrderDefs.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No matching order definitions found.</div>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b">
                      <th className="p-2.5 font-semibold">Order Code & Name</th>
                      <th className="p-2.5 font-semibold">Category</th>
                      <th className="p-2.5 font-semibold">Department</th>
                      <th className="p-2.5 font-semibold">Request Form</th>
                      <th className="p-2.5 font-semibold">Result Form</th>
                      <th className="p-2.5 font-semibold">SLA</th>
                      <th className="p-2.5 font-semibold">Billing Service Fee</th>
                      <th className="p-2.5 font-semibold">Status</th>
                      <th className="p-2.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredOrderDefs.map((def: ClinicalOrderDefinition) => {
                      const billingConf = (def as any).billing_configuration || {};
                      const slaConf = (def as any).sla_config_json || {};

                      return (
                        <tr key={def.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                          <td className="p-2.5">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{def.name}</div>
                            <code className="text-[10px] text-indigo-600 font-mono">{def.code}</code>
                          </td>
                          <td className="p-2.5">
                            <Badge variant="outline" className="text-[9px] uppercase">{def.category || "GENERAL"}</Badge>
                          </td>
                          <td className="p-2.5">
                            <div className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                              <Building2 className="h-3 w-3 text-slate-400" />
                              <span>{def.department_id || "LABORATORY"}</span>
                            </div>
                          </td>
                          <td className="p-2.5">
                            <div className="flex items-center gap-1 text-[10px]">
                              <FileText className="h-3 w-3 text-indigo-500 shrink-0" />
                              <span className="truncate max-w-[110px]">
                                {(def as any).requestFormConfig?.title || def.request_form_config_id || "Standard Intake"}
                              </span>
                            </div>
                          </td>
                          <td className="p-2.5">
                            <div className="flex items-center gap-1 text-[10px]">
                              <FileText className="h-3 w-3 text-purple-500 shrink-0" />
                              <span className="truncate max-w-[110px]">
                                {(def as any).resultFormConfig?.title || def.result_form_config_id || "Result Entry"}
                              </span>
                            </div>
                          </td>
                          <td className="p-2.5">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-amber-500" />
                              <span>{slaConf.target_minutes || 60}m</span>
                            </div>
                          </td>
                          <td className="p-2.5">
                            <div className="flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-300">
                              <Receipt className="h-3 w-3 text-emerald-500" />
                              <span>${billingConf.default_fee || "45.00"}</span>
                              {billingConf.service_code && (
                                <Badge variant="secondary" className="text-[8px] font-mono ml-1">{billingConf.service_code}</Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5">
                            <Badge className={`text-[9px] ${def.status === "PUBLISHED" ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}`}>
                              {def.status || "DRAFT"}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-right">
                            {def.status !== "PUBLISHED" ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handlePublish(def.definition_id || def.code)}
                                className="h-6 text-[10px] px-2 text-emerald-600 hover:bg-emerald-50"
                              >
                                Publish
                              </Button>
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* TABULAR CONFIGURABLE CATEGORIES VIEW */}
          <TabsContent value="categories" className="space-y-2 mt-0">
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b">
                    <th className="p-2.5 font-semibold">Category Code</th>
                    <th className="p-2.5 font-semibold">Category Name</th>
                    <th className="p-2.5 font-semibold">Description</th>
                    <th className="p-2.5 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        No categories configured. Click 'Configure Category' to create one.
                      </td>
                    </tr>
                  ) : (
                    categories.map((cat: any) => (
                      <tr key={cat.category_id || cat.code} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-mono text-indigo-600 font-semibold">{cat.code || "GENERAL"}</td>
                        <td className="p-2.5 font-medium">{cat.name}</td>
                        <td className="p-2.5 text-muted-foreground">{cat.description || "Configured Clinical Order Category"}</td>
                        <td className="p-2.5 text-right">
                          <Badge className="bg-emerald-600 text-white text-[9px]">ACTIVE</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* TABULAR DYNAMIC FORM TEMPLATES VIEW */}
          <TabsContent value="form-templates" className="space-y-2 mt-0">
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b">
                    <th className="p-2.5 font-semibold">Form Title</th>
                    <th className="p-2.5 font-semibold">Form Config ID</th>
                    <th className="p-2.5 font-semibold">Status</th>
                    <th className="p-2.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {formConfigs.map((fc: DiagnosisFormConfig) => (
                    <tr key={fc.config_id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-semibold text-slate-900 dark:text-slate-100">{fc.title}</td>
                      <td className="p-2.5 font-mono text-[10px] text-muted-foreground">{fc.config_id}</td>
                      <td className="p-2.5">
                        <Badge variant="outline" className="text-[9px]">ACTIVE TEMPLATE</Badge>
                      </td>
                      <td className="p-2.5 text-right">
                        <Badge variant="secondary" className="text-[9px]">LINKED</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="governance" className="space-y-2 mt-0">
            <div className="p-4 border rounded-lg bg-white dark:bg-slate-950 text-center text-muted-foreground space-y-1">
              <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">Multi-Tenant Governance & Immutable Snapshots</div>
              <p className="text-[11px]">Orders retain immutable version snapshots upon creation, protecting clinical history against configuration updates.</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
