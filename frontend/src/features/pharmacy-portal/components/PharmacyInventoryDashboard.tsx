"use client";

import { useState } from "react";
import {
  Boxes,
  PackageCheck,
  AlertTriangle,
  Clock,
  DollarSign,
  Plus,
  ShieldAlert,
  RefreshCw,
  Building2,
  Calendar,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useGetPharmacyAnalyticsQuery,
  useListBatchesQuery,
  useGetExpiringBatchesQuery,
  useQuarantineExpiredMutation,
  useReceiveStockMutation,
} from "@/redux/api/pharmacyInventoryApi";

type Props = {
  pharmacyId: string;
};

export function PharmacyInventoryDashboard({ pharmacyId }: Props) {
  const { data: analytics, refetch: refetchAnalytics } = useGetPharmacyAnalyticsQuery(pharmacyId);
  const { data: batches = [], refetch: refetchBatches } = useListBatchesQuery(pharmacyId);
  const { data: expiringBatches = [], refetch: refetchExpiring } = useGetExpiringBatchesQuery({ pharmacy_id: pharmacyId, days: 90 });
  const [quarantineExpired, { isLoading: isQuarantining }] = useQuarantineExpiredMutation();
  const [receiveStock, { isLoading: isReceiving }] = useReceiveStockMutation();

  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    medication_catalog_id: "",
    batch_number: "",
    manufacturer: "",
    expiry_date: "",
    quantity_received: "100",
    unit_cost: "5.00",
    selling_price: "12.00",
  });

  const handleQuarantine = async () => {
    try {
      const res = await quarantineExpired(pharmacyId).unwrap();
      toast.success(`Quarantined ${res.quarantinedCount} expired batches.`);
      refetchAnalytics();
      refetchBatches();
      refetchExpiring();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to quarantine expired stock");
    }
  };

  const handleReceiveSubmit = async () => {
    if (!formData.medication_catalog_id || !formData.batch_number || !formData.expiry_date) {
      toast.error("Please fill in medication catalog ID, batch number, and expiry date.");
      return;
    }

    try {
      await receiveStock({
        pharmacy_id: pharmacyId,
        medication_catalog_id: formData.medication_catalog_id,
        batch_number: formData.batch_number,
        manufacturer: formData.manufacturer,
        expiry_date: formData.expiry_date,
        quantity_received: parseInt(formData.quantity_received, 10) || 1,
        unit_cost: parseFloat(formData.unit_cost) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
      }).unwrap();

      toast.success("Stock batch received into inventory!");
      setIsReceiveDialogOpen(false);
      refetchAnalytics();
      refetchBatches();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to receive stock batch");
    }
  };

  return (
    <div className="space-y-4">
      {/* Analytics KPI Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border border-emerald-200 dark:border-emerald-900 bg-emerald-50/20 dark:bg-emerald-950/10">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Total Stock Value</p>
              <p className="text-lg font-bold text-emerald-900 dark:text-emerald-300">
                ${analytics?.total_stock_value?.toLocaleString() || "0.00"}
              </p>
            </div>
            <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </CardContent>
        </Card>

        <Card className="border border-blue-200 dark:border-blue-900 bg-blue-50/20 dark:bg-blue-950/10">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Total Available Units</p>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-300">
                {analytics?.total_medications_quantity?.toLocaleString() || "0"}
              </p>
            </div>
            <Boxes className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </CardContent>
        </Card>

        <Card className="border border-amber-200 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/10">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Low Stock Warnings</p>
              <p className="text-lg font-bold text-amber-900 dark:text-amber-300">
                {analytics?.low_stock_items || "0"}
              </p>
            </div>
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </CardContent>
        </Card>

        <Card className="border border-rose-200 dark:border-rose-900 bg-rose-50/20 dark:bg-rose-950/10">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Expiring / Quarantined</p>
              <p className="text-lg font-bold text-rose-900 dark:text-rose-300">
                {analytics?.expired_or_quarantined_items || "0"}
              </p>
            </div>
            <Clock className="h-6 w-6 text-rose-600 dark:text-rose-400" />
          </CardContent>
        </Card>
      </div>

      {/* Main Inventory Batches Management Card */}
      <Card className="border shadow-sm">
        <CardHeader className="py-3 bg-slate-50/60 dark:bg-slate-900/40 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-600" />
            <CardTitle className="text-sm font-semibold">
              Pharmacy Medication Stock Batches ({batches.length})
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
              disabled={isQuarantining}
              onClick={handleQuarantine}
            >
              <ShieldAlert className="h-3.5 w-3.5 mr-1" /> Quarantine Expired
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
              onClick={() => setIsReceiveDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Receive New Stock Batch
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 text-xs">
          <div className="divide-y border-b">
            {batches.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No medication stock batches registered. Click "Receive New Stock Batch" to add stock.
              </div>
            ) : (
              batches.map((batch) => (
                <div key={batch.id} className="p-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      {batch.medicationCatalog?.generic_name || "Medication Item"}
                      <span className="text-[10px] font-mono text-muted-foreground">
                        (Batch: #{batch.batch_number})
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Manufacturer: {batch.manufacturer || "Generic Pharma"} | Expiry: {batch.expiry_date}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold text-emerald-900 dark:text-emerald-300">
                        Qty: {batch.quantity_available} / {batch.quantity_received}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Price: ${batch.selling_price} (Cost: ${batch.unit_cost})
                      </div>
                    </div>
                    <Badge
                      className={`text-[10px] ${
                        batch.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800"
                          : batch.status === "DEPLETED"
                          ? "bg-slate-100 text-slate-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {batch.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Receive Stock Modal */}
      <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <PackageCheck className="h-4 w-4 text-emerald-600" />
              Receive Medication Stock Batch
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label>Medication Catalog ID *</Label>
              <Input
                placeholder="Enter Catalog UUID..."
                className="text-xs h-8"
                value={formData.medication_catalog_id}
                onChange={(e) => setFormData({ ...formData, medication_catalog_id: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Batch Number *</Label>
                <Input
                  placeholder="e.g. BATCH-2026-X"
                  className="text-xs h-8"
                  value={formData.batch_number}
                  onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Expiry Date *</Label>
                <Input
                  type="date"
                  className="text-xs h-8"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  className="text-xs h-8"
                  value={formData.quantity_received}
                  onChange={(e) => setFormData({ ...formData, quantity_received: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Unit Cost ($)</Label>
                <Input
                  type="number"
                  className="text-xs h-8"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Selling Price ($)</Label>
                <Input
                  type="number"
                  className="text-xs h-8"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsReceiveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isReceiving}
              onClick={handleReceiveSubmit}
            >
              {isReceiving ? "Receiving..." : "Save Stock Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
