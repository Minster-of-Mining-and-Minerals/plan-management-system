"use client";

import { useState } from "react";
import { PlusCircle, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  useGetOrderDefinitionsQuery,
  useInstantiateRuntimeOrderMutation,
  type ClinicalOrderDefinition,
} from "@/redux/api/clinicalOrderDefinitionApi";
import { useGetDiagnosisFormConfigQuery } from "@/redux/api/diagnosisFormApi";
import { DiagnosisFormRenderer } from "@/features/diagnosis-forms/components/DiagnosisFormRenderer";

interface DynamicOrderPlacementDialogProps {
  appointmentId: string;
  patientId: string;
  orderedByUserId: string;
  onOrderSuccess?: () => void;
}

export function DynamicOrderPlacementDialog({
  appointmentId,
  patientId,
  orderedByUserId,
  onOrderSuccess,
}: DynamicOrderPlacementDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDefCode, setSelectedDefCode] = useState<string>("");
  const [priority, setPriority] = useState<string>("ROUTINE");
  const [notes, setNotes] = useState<string>("");
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const { data: definitions = [] } = useGetOrderDefinitionsQuery();
  const [instantiateOrder, { isLoading }] = useInstantiateRuntimeOrderMutation();

  const selectedDef = definitions.find((d) => d.code === selectedDefCode || d.definition_id === selectedDefCode);
  const requestFormConfigId = selectedDef?.request_form_config_id;

  const { data: requestFormConfig } = useGetDiagnosisFormConfigQuery(requestFormConfigId!, {
    skip: !requestFormConfigId,
  });

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDef) return;

    try {
      await instantiateOrder({
        definition_code: selectedDef.code,
        definition_id: selectedDef.definition_id,
        appointment_id: appointmentId,
        patient_id: patientId,
        ordered_by: orderedByUserId,
        priority,
        notes,
        intent_data: {
          reason: notes || "Order placed dynamically",
          request_form_payload: formValues,
        },
      }).unwrap();

      setMsg(`Order '${selectedDef.name}' placed successfully!`);
      setTimeout(() => {
        setMsg(null);
        setIsOpen(false);
        if (onOrderSuccess) onOrderSuccess();
      }, 1500);
    } catch (err: any) {
      setMsg(`Failed to place order: ${err?.data?.message || err?.message}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
          <PlusCircle className="h-3.5 w-3.5" />
          Add Dynamic Clinical Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold flex items-center justify-between">
            <span>Place Clinical Order</span>
            <Badge className="text-[9px] bg-indigo-600">Dynamic Renderer</Badge>
          </DialogTitle>
        </DialogHeader>

        {msg && (
          <div className={`p-2 border rounded text-xs font-medium ${msg.includes("Failed") ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
            {msg}
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="space-y-4 pt-1 text-xs">
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold">Select Order Definition Catalog Item</Label>
            <Select value={selectedDefCode} onValueChange={setSelectedDefCode}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Search published clinical order definitions..." />
              </SelectTrigger>
              <SelectContent>
                {definitions.map((def) => (
                  <SelectItem key={def.code} value={def.code}>
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="font-semibold">{def.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">[{def.department_id}]</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDef && (
            <div className="p-2.5 border rounded-lg bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-800">{selectedDef.name}</span>
                <Badge variant="outline" className="text-[9px] font-mono">{selectedDef.category}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">{selectedDef.description || "Dynamic composite order definition."}</p>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t text-[11px]">
                <div className="space-y-1">
                  <Label className="text-[10px]">Order Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ROUTINE">Routine</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                      <SelectItem value="STAT">STAT (Immediate)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Clinical Indications / Notes</Label>
                  <Textarea
                    placeholder="Clinical reason..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-8 text-xs min-h-[32px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Request Form Rendering */}
          {requestFormConfig && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700">
                <FileText className="h-3.5 w-3.5" />
                <span>Dynamic Intake Request Form: {requestFormConfig.title}</span>
              </div>
              <div className="p-3 border rounded-lg bg-white">
                <DiagnosisFormRenderer
                  configId={requestFormConfig.config_id}
                  values={formValues}
                  onChange={(newVals) => setFormValues(newVals)}
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={!selectedDef || isLoading}
            className="w-full h-9 text-xs bg-indigo-600 hover:bg-indigo-700 font-semibold"
          >
            {isLoading ? "Instantiating Runtime Order..." : "Submit Clinical Order"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
