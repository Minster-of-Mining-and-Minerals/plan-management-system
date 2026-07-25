"use client";

import { useState } from "react";
import { CheckSquare, Play, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useExecuteOrderStepMutation } from "@/redux/api/clinicalWorkflowApi";

interface ClinicalOrderExecutionPanelProps {
  orderId: string;
  orderType: string;
  currentStatus: string;
  onCompleted?: () => void;
}

export function ClinicalOrderExecutionPanel({
  orderId,
  orderType,
  currentStatus,
  onCompleted,
}: ClinicalOrderExecutionPanelProps) {
  const [executeStep, { isLoading }] = useExecuteOrderStepMutation();
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const handleExecute = async (status: string) => {
    try {
      await executeStep({
        order_id: orderId,
        step_status: status,
        result_notes: notes || `Executed step ${status} dynamically`,
      }).unwrap();

      setMessage(`Order updated to status '${status}'`);
      if (onCompleted) onCompleted();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage(`Execution failed: ${err?.message || "Error"}`);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-emerald-600" />
            <CardTitle className="text-sm font-semibold">Department Dynamic Order Execution</CardTitle>
          </div>
          <Badge variant="outline" className="text-[9px]">{orderType} • {currentStatus}</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-3">
        {message && <div className="p-2 border rounded bg-indigo-50 text-indigo-700 text-[10px] font-medium">{message}</div>}

        <div>
          <label className="block text-[10px] font-medium text-slate-700 dark:text-slate-300 mb-1">Execution / Dynamic Result Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter execution results or diagnostic values..."
            className="w-full p-2 text-xs border rounded bg-background"
          />
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={isLoading} onClick={() => handleExecute("IN_PROGRESS")}>
            <Play className="h-3 w-3 mr-1 text-blue-600" /> In Progress
          </Button>
          <Button size="sm" variant="default" className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700" disabled={isLoading} onClick={() => handleExecute("FULFILLED")}>
            <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Fulfilled
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
