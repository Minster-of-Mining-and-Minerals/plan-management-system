"use client";

import { useState } from "react";
import { ArrowLeftRight, CheckCircle2, PackageCheck, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useListStockTransfersQuery,
  useConfirmStockTransferMutation,
} from "@/redux/api/pharmacyHardeningApi";

type Props = {
  pharmacyId: string;
};

export function StockTransferPanel({ pharmacyId }: Props) {
  const { data: transfers = [], refetch } = useListStockTransfersQuery(pharmacyId);
  const [confirmTransfer, { isLoading: isConfirming }] = useConfirmStockTransferMutation();

  const handleConfirm = async (transferId: string) => {
    try {
      await confirmTransfer(transferId).unwrap();
      toast.success("Stock transfer confirmed & stock added to destination inventory!");
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to confirm stock transfer");
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 bg-slate-50/60 dark:bg-slate-900/40 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-emerald-600" />
          <CardTitle className="text-sm font-semibold">
            Inter-Pharmacy Stock Transfers ({transfers.length})
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-0 text-xs">
        {transfers.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            No inter-pharmacy stock transfer shipments recorded.
          </div>
        ) : (
          <div className="divide-y border-b">
            {transfers.map((t) => (
              <div key={t.id} className="p-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    Batch: #{t.batch?.batch_number || "Stock Batch"} ({t.quantity} Units)
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Truck className="h-3 w-3 text-slate-500" />
                    {t.sourcePharmacy?.pharmacy_name || "Source Pharmacy"} &rarr; {t.destinationPharmacy?.pharmacy_name || "Destination Pharmacy"}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    className={`text-[10px] ${
                      t.status === "RECEIVED"
                        ? "bg-emerald-100 text-emerald-800"
                        : t.status === "TRANSIT"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {t.status}
                  </Badge>

                  {t.status === "TRANSIT" && t.destination_pharmacy_id === pharmacyId && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-[11px]"
                      disabled={isConfirming}
                      onClick={() => handleConfirm(t.id)}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Confirm Reception
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
