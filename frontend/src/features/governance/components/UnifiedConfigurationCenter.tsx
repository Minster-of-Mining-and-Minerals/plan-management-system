"use client";

import { useState } from "react";
import {
  Layers,
  FileText,
  Clock,
  DollarSign,
  Plus,
  CheckCircle2,
  Building2,
  Tag,
  Receipt,
  Sparkles,
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
} from "@/redux/api/billingServiceApi";

export function UnifiedConfigurationCenter() {
  const [activeTab, setActiveTab] = useState("definitions");
  const [isOpen, setIsOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { data: rawOrderDefs = [], isLoading } = useGetOrderDefinitionsQuery();
  const { data: rawFormConfigs = [] } = useListDiagnosisFormConfigsQuery();
  const { data: rawDepartments = [] } = useGetDepartmentsQuery();
  const { data: rawBillingServices = [] } = useListActiveBillingServicesQuery();
  const { data: rawCategories = [] } = useListBillingServiceCategoriesQuery();

  const orderDefs = Array.isArray(rawOrderDefs) ? rawOrderDefs : (rawOrderDefs as any)?.data || [];
  const formConfigs = Array.isArray(rawFormConfigs) ? rawFormConfigs : (rawFormConfigs as any)?.data || [];
  const departments = Array.isArray(rawDepartments) ? rawDepartments : (rawDepartments as any)?.data || [];
  const billingServices = Array.isArray(rawBillingServices) ? rawBillingServices : (rawBillingServices as any)?.data || [];
  const categories = Array.isArray(rawCategories) ? rawCategories : (rawCategories as any)?.data || [];

  const [createOrderDefinition, { isLoading: isCreating }] = useCreateOrderDefinitionMutation();
  const [publishOrderDefinition] = usePublishOrderDefinitionMutation();

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
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg(`Failed to create order definition: ${err?.data?.message || err?.message}`);
    }
  };

  const handlePublish = async (idOrCode: string) => {
    try {
      await publishOrderDefinition(idOrCode).unwrap();
      setMsg(`Order definition published successfully!`);
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg(`Publish failed: ${err?.message}`);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <CardTitle className="text-sm font-semibold">
              Unified Clinical Order Configuration Center
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="text-[9px] bg-indigo-600 text-white">
              Dynamic Configurable
            </Badge>
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
                      <Label className="text-[11px]">Category</Label>
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 h-8 text-[11px] mb-3">
            <TabsTrigger value="definitions" className="py-1">Order Definitions ({orderDefs.length})</TabsTrigger>
            <TabsTrigger value="form-templates" className="py-1">Dynamic Form Templates ({formConfigs.length})</TabsTrigger>
            <TabsTrigger value="governance" className="py-1">Governance & Versioning</TabsTrigger>
          </TabsList>

          <TabsContent value="definitions" className="space-y-2 mt-0">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground animate-pulse">Loading order definitions...</div>
            ) : orderDefs.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No order definitions created yet. Click 'New Order Definition' to begin.</div>
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
                    {orderDefs.map((def: ClinicalOrderDefinition) => {
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

          <TabsContent value="form-templates" className="space-y-2 mt-0">
            <div className="grid grid-cols-2 gap-2">
              {formConfigs.map((fc: DiagnosisFormConfig) => (
                <div key={fc.config_id} className="p-2.5 border rounded bg-slate-50/50 space-y-1 text-[11px]">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{fc.title}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">ID: {fc.config_id}</div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="governance" className="space-y-2 mt-0">
            <div className="p-3 border rounded text-center text-muted-foreground">
              Lifecycle Governance, Immutable Version Snapshots, and Multi-Tenant Isolation Protection.
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
