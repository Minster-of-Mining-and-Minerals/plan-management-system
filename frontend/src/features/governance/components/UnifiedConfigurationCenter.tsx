"use client";

import { useState } from "react";
import { ShieldCheck, Layers, GitBranch, FileText, Clock, DollarSign, Settings, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UnifiedOrderDefinition {
  code: string;
  name: string;
  category: string;
  department_id: string;
  request_form_title?: string;
  result_form_title?: string;
  sla_minutes?: number;
  is_billable?: boolean;
  default_fee?: number;
  status: string;
  version: string;
}

export function UnifiedConfigurationCenter() {
  const [activeTab, setActiveTab] = useState("definitions");

  const mockOrderDefinitions: UnifiedOrderDefinition[] = [
    {
      code: "DEF_CBC_TEST",
      name: "Complete Blood Count (CBC) Order",
      category: "DIAGNOSTIC",
      department_id: "LABORATORY",
      request_form_title: "Specimen Collection Request Form",
      result_form_title: "CBC Hematology Result Entry",
      sla_minutes: 60,
      is_billable: true,
      default_fee: 45.0,
      status: "PUBLISHED",
      version: "1.0.0",
    },
    {
      code: "DEF_MRI_SPINE",
      name: "MRI Lumbar Spine Imaging Order",
      category: "RADIOLOGY",
      department_id: "RADIOLOGY",
      request_form_title: "MRI Screening & Contrast Allergy Form",
      result_form_title: "Radiology Observation & Imaging Report",
      sla_minutes: 120,
      is_billable: true,
      default_fee: 350.0,
      status: "PUBLISHED",
      version: "1.0.0",
    },
    {
      code: "DEF_PHYSIO_SESSION",
      name: "Physical Therapy Rehab Session",
      category: "THERAPEUTIC",
      department_id: "PHYSIOTHERAPY",
      request_form_title: "Physiotherapy Intake Form",
      result_form_title: "ROM & Pain Evaluation Result Entry",
      sla_minutes: 45,
      is_billable: true,
      default_fee: 80.0,
      status: "PUBLISHED",
      version: "1.0.0",
    },
  ];

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <CardTitle className="text-sm font-semibold">Unified Clinical Order Configuration Center</CardTitle>
          </div>
          <Badge className="text-[9px] bg-indigo-600 text-white">Single Architecture Entity</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 h-8 text-[11px] mb-3">
            <TabsTrigger value="definitions" className="py-1">Order Definitions</TabsTrigger>
            <TabsTrigger value="form-templates" className="py-1">Form Templates</TabsTrigger>
            <TabsTrigger value="governance" className="py-1">Governance & Versioning</TabsTrigger>
          </TabsList>

          <TabsContent value="definitions" className="space-y-2 mt-0">
            {mockOrderDefinitions.map((def) => (
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
                    <Badge variant="outline" className="text-[9px] font-mono">v{def.version}</Badge>
                    <Badge className="text-[9px] bg-emerald-600 text-white">{def.status}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1 border-t text-[10px]">
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3 text-indigo-500" />
                    <span className="text-muted-foreground">Request Form:</span>
                    <span className="font-medium truncate">{def.request_form_title}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3 text-purple-500" />
                    <span className="text-muted-foreground">Result Form:</span>
                    <span className="font-medium truncate">{def.result_form_title}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-500" />
                    <span className="text-muted-foreground">SLA:</span>
                    <span className="font-medium">{def.sla_minutes} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-emerald-500" />
                    <span className="text-muted-foreground">Fee:</span>
                    <span className="font-medium">${def.default_fee?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="form-templates" className="space-y-2 mt-0">
            <div className="p-3 border rounded text-center text-muted-foreground">
              Reusable Clinical Form Templates (`DiagnosisFormConfig` aliases) linked directly into composite Order Definitions.
            </div>
          </TabsContent>

          <TabsContent value="governance" className="space-y-2 mt-0">
            <div className="p-3 border rounded text-center text-muted-foreground">
              Lifecycle Governance, Immutable Snapshots, and Multi-Tenant Isolation Protection.
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
