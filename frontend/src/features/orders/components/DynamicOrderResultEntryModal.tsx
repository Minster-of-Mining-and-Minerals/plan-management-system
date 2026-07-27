"use client";

import { useState } from "react";
import { CheckCircle2, FileText, Upload, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useGetDiagnosisFormConfigQuery } from "@/redux/api/diagnosisFormApi";
import { DiagnosisFormRenderer } from "@/features/diagnosis-forms/components/DiagnosisFormRenderer";

interface DynamicOrderResultEntryModalProps {
  orderId: string;
  orderTitle: string;
  resultFormConfigId?: string | null;
  onCompleteSuccess?: () => void;
}

export function DynamicOrderResultEntryModal({
  orderId,
  orderTitle,
  resultFormConfigId,
  onCompleteSuccess,
}: DynamicOrderResultEntryModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [resultValues, setResultValues] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { data: resultFormConfig } = useGetDiagnosisFormConfigQuery(resultFormConfigId!, {
    skip: !resultFormConfigId,
  });

  const handleCompleteResult = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Simulate completion submission
      await new Promise((resolve) => setTimeout(resolve, 800));
      setMsg(`Result parameters for '${orderTitle}' saved and order marked COMPLETED!`);
      setTimeout(() => {
        setMsg(null);
        setIsOpen(false);
        if (onCompleteSuccess) onCompleteSuccess();
      }, 1500);
    } catch (err: any) {
      setMsg(`Error completing order: ${err?.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Enter Test Results
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold flex items-center justify-between">
            <span>Result Entry: {orderTitle}</span>
            <Badge className="text-[9px] bg-emerald-600">Station Queue Fulfillment</Badge>
          </DialogTitle>
        </DialogHeader>

        {msg && (
          <div className="p-2 border rounded bg-emerald-50 text-emerald-700 text-xs font-medium">
            {msg}
          </div>
        )}

        <form onSubmit={handleCompleteResult} className="space-y-4 pt-1 text-xs">
          <div className="p-2.5 border rounded-lg bg-slate-50/50 space-y-1">
            <div className="text-[11px] font-semibold text-slate-800">Order Ref: {orderId}</div>
            <div className="text-[10px] text-muted-foreground">Fill in test parameter values and upload any attached observations.</div>
          </div>

          {/* Render Dynamic Result Form Template */}
          {resultFormConfig ? (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-700">
                <FileText className="h-3.5 w-3.5" />
                <span>Dynamic Result Entry Schema: {resultFormConfig.title}</span>
              </div>
              <div className="p-3 border rounded-lg bg-white">
                <DiagnosisFormRenderer
                  configId={resultFormConfig.config_id}
                  values={resultValues}
                  onChange={(newVals: Record<string, any>) => setResultValues(newVals)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1 pt-2 border-t">
              <Label className="text-[11px]">Technician Observation / Result Summary</Label>
              <Textarea
                placeholder="Enter test findings and parameters..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-20 text-xs"
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-9 text-xs bg-emerald-600 hover:bg-emerald-700 font-semibold"
          >
            {submitting ? "Saving & Finalizing..." : "Submit Results & Complete Order"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
