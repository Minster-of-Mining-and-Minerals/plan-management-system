"use client";

import { useState } from "react";
import { Sliders, Plus, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useCreateOrderDefinitionMutation,
  useGetDesignerConfigOptionsQuery,
} from "@/redux/api/clinicalOrderDefinitionApi";

export function ClinicalOrderDesigner() {
  const { data: options } = useGetDesignerConfigOptionsQuery();
  const [createDefinition, { isLoading }] = useCreateOrderDefinitionMutation();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("DIAGNOSTIC");
  const [departmentId, setDepartmentId] = useState("LABORATORY");
  const [description, setDescription] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formattedCode = code.toUpperCase().replace(/\s+/g, "_") || `DEF_${Date.now()}`;
      const res = await createDefinition({
        name: name || "Custom Configured Order Definition",
        code: formattedCode,
        category,
        department_id: departmentId,
        description: description || "Created via Clinical Order Designer",
        version: "1.0.0",
        status: "PUBLISHED",
      }).unwrap();

      setStatusMsg(`Order Definition '${res.name}' (v${res.version}) published successfully!`);
      setName("");
      setCode("");
      setDescription("");
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg(`Error creating definition: ${err?.message || "Failed"}`);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-emerald-600" />
            <CardTitle className="text-sm font-semibold">Clinical Order Designer (Configuration Builder)</CardTitle>
          </div>
          <Badge className="text-[9px] bg-emerald-600 text-white">Zero-Code Order Engine</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-3">
        {statusMsg && <div className="p-2 border rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium">{statusMsg}</div>}

        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-slate-700 dark:text-slate-300 mb-1">Order Definition Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hemodialysis Treatment Session"
                className="w-full p-2 text-xs border rounded bg-background"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-700 dark:text-slate-300 mb-1">Definition Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. DEF_DIALYSIS_SESSION"
                className="w-full p-2 text-xs border rounded bg-background"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 text-xs border rounded bg-background"
              >
                {(options?.available_categories || ["DIAGNOSTIC", "THERAPEUTIC", "CONSULTATION"]).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full p-2 text-xs border rounded bg-background"
              >
                {(options?.available_departments || ["LABORATORY", "RADIOLOGY", "PHYSIOTHERAPY", "DIALYSIS", "ONCOLOGY"]).map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-slate-700 dark:text-slate-300 mb-1">Description / Clinical Rationale</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Clinical order definition template specifications..."
              className="w-full h-14 p-2 text-xs border rounded bg-background"
            />
          </div>

          <Button type="submit" size="sm" className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
            <Plus className="h-3 w-3 mr-1" /> Publish Clinical Order Definition
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
