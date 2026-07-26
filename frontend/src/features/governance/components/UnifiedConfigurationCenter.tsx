"use client";

import { useState } from "react";
import { ShieldCheck, Layers, GitBranch, FileText, Clock, DollarSign, Plus, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useGetOrderDefinitionsQuery,
  useCreateOrderDefinitionMutation,
  usePublishOrderDefinitionMutation,
  type ClinicalOrderDefinition,
} from "@/redux/api/clinicalOrderDefinitionApi";
import { useListDiagnosisFormConfigsQuery } from "@/redux/api/diagnosisFormApi";

export function UnifiedConfigurationCenter() {
  const [activeTab, setActiveTab] = useState("definitions");
  const [isOpen, setIsOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { data: orderDefs = [], isLoading } = useGetOrderDefinitionsQuery();
  const { data: formConfigs = [] } = useListDiagnosisFormConfigsQuery();
  const [createOrderDefinition, { isLoading: isCreating }] = useCreateOrderDefinitionMutation();
  const [publishOrderDefinition] = usePublishOrderDefinitionMutation();

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    category: "DIAGNOSTIC",
    department_id: "LABORATORY",
    request_form_config_id: "",
    result_form_config_id: "",
    sla_minutes: 60,
    default_fee: 50,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createOrderDefinition({
        code: formData.code.toUpperCase().trim(),
        name: formData.name.trim(),
        category: formData.category,
        department_id: formData.department_id,
        request_form_config_id: formData.request_form_config_id || undefined,
        result_form_config_id: formData.result_form_config_id || undefined,
        sla_config_json: { target_minutes: Number(formData.sla_minutes) },
        billing_configuration: { is_billable: true, default_fee: Number(formData.default_fee) },
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
            <CardTitle className="text-sm font-semibold">Unified Clinical Order Configuration Center</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="text-[9px] bg-indigo-600 text-white">Zero-Code Configurable</Badge>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  New Order Definition
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-sm font-bold">Create Dynamic Clinical Order Definition</DialogTitle>
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
                          <SelectItem value="DIAGNOSTIC">Diagnostic</SelectItem>
                          <SelectItem value="RADIOLOGY">Radiology</SelectItem>
                          <SelectItem value="THERAPEUTIC">Therapeutic</SelectItem>
                          <SelectItem value="LABORATORY">Laboratory</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Target Department</Label>
                      <Select
                        value={formData.department_id}
                        onValueChange={(val) => setFormData({ ...formData, department_id: val })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LABORATORY">Laboratory</SelectItem>
                          <SelectItem value="RADIOLOGY">Radiology</SelectItem>
                          <SelectItem value="OPHTHALMOLOGY">Ophthalmology</SelectItem>
                          <SelectItem value="PHYSIOTHERAPY">Physiotherapy</SelectItem>
                          <SelectItem value="GENERAL">General Practice</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">Linked Intake Request Form Template</Label>
                    <Select
                      value={formData.request_form_config_id}
                      onValueChange={(val) => setFormData({ ...formData, request_form_config_id: val })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select Dynamic Request Form Template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {formConfigs.map((fc) => (
                          <SelectItem key={fc.config_id} value={fc.config_id}>
                            {fc.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">Linked Result Entry Form Template</Label>
                    <Select
                      value={formData.result_form_config_id}
                      onValueChange={(val) => setFormData({ ...formData, result_form_config_id: val })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select Dynamic Result Entry Form Template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {formConfigs.map((fc) => (
                          <SelectItem key={fc.config_id} value={fc.config_id}>
                            {fc.title}
                          </SelectItem>
                        ))}
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
                      <Label className="text-[11px]">Default Fee ($)</Label>
                      <Input
                        type="number"
                        value={formData.default_fee}
                        onChange={(e) => setFormData({ ...formData, default_fee: Number(e.target.value) })}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={isCreating} className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700">
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
            <TabsTrigger value="definitions" className="py-1">Order Definitions</TabsTrigger>
            <TabsTrigger value="form-templates" className="py-1">Form Templates ({formConfigs.length})</TabsTrigger>
            <TabsTrigger value="governance" className="py-1">Governance & Versioning</TabsTrigger>
          </TabsList>

          <TabsContent value="definitions" className="space-y-2 mt-0">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground animate-pulse">Loading order definitions...</div>
            ) : orderDefs.map((def: ClinicalOrderDefinition) => (
              <div key={def.code} className="p-2.5 border rounded-lg bg-white dark:bg-slate-950 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{def.name}</span>
                      <span className="ml-2 text-[10px] text-muted-foreground font-mono">({def.code})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[9px] font-mono">v{def.version || "1.0.0"}</Badge>
                    <Badge className={`text-[9px] ${def.status === "PUBLISHED" ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}`}>
                      {def.status || "DRAFT"}
                    </Badge>
                    {def.status !== "PUBLISHED" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePublish(def.definition_id || def.code)}
                        className="h-5 text-[10px] px-1.5 text-emerald-600 hover:bg-emerald-50"
                      >
                        Publish
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1 border-t text-[10px]">
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3 text-indigo-500" />
                    <span className="text-muted-foreground">Request Form:</span>
                    <span className="font-medium truncate">
                      {(def as any).requestFormConfig?.title || def.request_form_config_id || "Standard Intake"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3 text-purple-500" />
                    <span className="text-muted-foreground">Result Form:</span>
                    <span className="font-medium truncate">
                      {(def as any).resultFormConfig?.title || def.result_form_config_id || "Result Entry"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-500" />
                    <span className="text-muted-foreground">SLA:</span>
                    <span className="font-medium">{(def as any).sla_config_json?.target_minutes || 60} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-emerald-500" />
                    <span className="text-muted-foreground">Fee:</span>
                    <span className="font-medium">${(def as any).billing_configuration?.default_fee || "45.00"}</span>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="form-templates" className="space-y-2 mt-0">
            <div className="grid grid-cols-2 gap-2">
              {formConfigs.map((fc) => (
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
