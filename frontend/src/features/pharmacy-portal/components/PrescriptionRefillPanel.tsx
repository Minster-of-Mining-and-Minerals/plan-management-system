"use client";

import { RefreshCw, History, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useProcessRefillMutation,
  useGetRefillHistoryQuery,
} from "@/redux/api/pharmacyHardeningApi";

type Props = {
  prescriptionId: string;
  maxRefills?: number;
};

export function PrescriptionRefillPanel({ prescriptionId, maxRefills = 3 }: Props) {
  const { data: history = [], refetch } = useGetRefillHistoryQuery(prescriptionId);
  const [processRefill, { isLoading }] = useProcessRefillMutation();

  const handleRefill = async () => {
    try {
      const res = await processRefill({
        prescription_id: prescriptionId,
        max_refills: maxRefills,
      }).unwrap();

      toast.success(`Refill #${res.refill.refill_number} processed! (${res.remaining_refills} refills remaining)`);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to process prescription refill");
    }
  };

  const remaining = maxRefills - history.length;

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 bg-slate-50/60 dark:bg-slate-900/40 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-emerald-600" />
          <CardTitle className="text-sm font-semibold">
            Prescription Refill Engine ({history.length} / {maxRefills} Used)
          </CardTitle>
        </div>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
          disabled={isLoading || remaining <= 0}
          onClick={handleRefill}
        >
          <RefreshCw className="h-3 w-3 mr-1" /> Process Refill
        </Button>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-2">
        <div className="flex items-center justify-between p-2 rounded bg-slate-100 dark:bg-slate-800">
          <span className="font-medium text-slate-700 dark:text-slate-300">Remaining Authorized Refills:</span>
          <Badge className={remaining > 0 ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}>
            {remaining > 0 ? `${remaining} Refills Allowed` : "Refills Exhausted"}
          </Badge>
        </div>

        {history.length > 0 && (
          <div className="space-y-1">
            <p className="font-semibold text-muted-foreground flex items-center gap-1 text-[11px]">
              <History className="h-3 w-3" /> Dispensed Refill History:
            </p>
            <div className="divide-y border rounded bg-white dark:bg-slate-950">
              {history.map((h: any) => (
                <div key={h.id} className="p-2 flex items-center justify-between">
                  <span className="font-semibold">Refill #{h.refill_number}</span>
                  <span className="text-muted-foreground">
                    Dispensed: {new Date(h.dispensed_at).toLocaleDateString()} by {h.dispenser?.full_name || "Staff"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
