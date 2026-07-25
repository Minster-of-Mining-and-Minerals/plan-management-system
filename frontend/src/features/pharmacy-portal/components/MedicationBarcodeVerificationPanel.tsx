"use client";

import { useState } from "react";
import { Barcode, CheckCircle2, AlertOctagon, Scan } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useVerifyBarcodeMutation, BarcodeVerificationResult } from "@/redux/api/pharmacyHardeningApi";

type Props = {
  batchId?: string;
  patientId?: string;
};

export function MedicationBarcodeVerificationPanel({ batchId, patientId }: Props) {
  const [barcode, setBarcode] = useState("");
  const [result, setResult] = useState<BarcodeVerificationResult | null>(null);
  const [verifyBarcode, { isLoading }] = useVerifyBarcodeMutation();

  const handleScan = async () => {
    if (!barcode && !batchId) {
      toast.error("Please enter a barcode identifier or select a batch.");
      return;
    }

    try {
      const res = await verifyBarcode({
        barcode_identifier: barcode,
        batch_id: batchId,
        patient_id: patientId,
      }).unwrap();

      setResult(res);
      if (res.is_valid) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err?.data?.message || "Barcode verification failed");
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 bg-slate-50/60 dark:bg-slate-900/40 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Barcode className="h-4 w-4 text-emerald-600" />
          <CardTitle className="text-sm font-semibold">
            Barcode Medication Safety Verification
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3 text-xs">
        <div className="flex gap-2">
          <Input
            placeholder="Scan barcode or type barcode identifier..."
            className="text-xs h-9 font-mono"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
          />
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 text-xs"
            disabled={isLoading}
            onClick={handleScan}
          >
            <Scan className="h-3.5 w-3.5 mr-1" /> Verify Barcode
          </Button>
        </div>

        {result && (
          <div
            className={`p-3 rounded-lg border flex items-start gap-3 ${
              result.is_valid
                ? "bg-emerald-50/50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300"
                : "bg-rose-50/50 border-rose-200 text-rose-900 dark:bg-rose-950/20 dark:border-rose-800 dark:text-rose-300"
            }`}
          >
            {result.is_valid ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            )}

            <div className="space-y-1">
              <div className="font-semibold text-sm flex items-center gap-2">
                {result.message}
                <Badge className={result.is_valid ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}>
                  {result.status}
                </Badge>
              </div>

              {result.medication_name && (
                <p className="text-xs font-medium">
                  Medication: {result.medication_name} (Batch: #{result.batch_number}) | Expiry: {result.expiry_date}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
