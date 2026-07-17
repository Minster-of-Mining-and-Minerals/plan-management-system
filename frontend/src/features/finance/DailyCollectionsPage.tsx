"use client";

import { useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { formatBillingCurrency } from "@/features/billing/billingUtils";
import { CashierPaymentLedgerList } from "@/features/cashier/CashierPaymentLedgerList";
import { formatPaymentMethod } from "@/features/cashier/cashierUtils";
import {
  useGetFinanceCollectionsQuery,
  useLazyGetCashierReceiptQuery,
} from "@/redux/api/cashierApi";
import type { CashierPaymentLedgerItem } from "@/redux/types/cashier";
import { printCashierReceipt } from "@/features/cashier/cashierReceiptPrint";
import type { ActionButton } from "@/types/tableLayout";
import { CASHIER_PERMISSIONS } from "@/features/cashier/cashierUtils";
import { getAuthToken } from "@/lib/authToken";

function formatToday() {
  return new Date().toISOString().slice(0, 10);
}

async function downloadCollectionsExport(params: {
  from_date: string;
  to_date: string;
  search?: string;
}) {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:4000/api").replace(
    /\/$/,
    ""
  );
  const qs = new URLSearchParams();
  if (params.from_date) qs.set("from_date", params.from_date);
  if (params.to_date) qs.set("to_date", params.to_date);
  if (params.search) qs.set("search", params.search);
  const token = getAuthToken();
  const res = await fetch(`${base}/finance/cashier/collections/export?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || "Export failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `collections_${params.from_date}_to_${params.to_date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function DailyCollectionsPage() {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(formatToday());
  const [toDate, setToDate] = useState(formatToday());
  const [selected, setSelected] = useState<CashierPaymentLedgerItem | null>(null);
  const [fetchReceipt] = useLazyGetCashierReceiptQuery();

  const { data, isLoading } = useGetFinanceCollectionsQuery({
    search: search.trim() || undefined,
    from_date: fromDate,
    to_date: toDate,
    page: 1,
    limit: 200,
  });

  const methodSummary = useMemo(() => {
    if (!data?.by_method) return [];
    return Object.entries(data.by_method).map(([method, amount]) => ({
      method,
      amount,
    }));
  }, [data?.by_method]);

  const cashierSummary = useMemo(() => {
    if (!data?.by_cashier) return [];
    return Object.entries(data.by_cashier).map(([name, amount]) => ({
      name,
      amount,
    }));
  }, [data?.by_cashier]);

  const handleReprint = async (paymentId: string) => {
    try {
      const receipt = await fetchReceipt(paymentId).unwrap();
      printCashierReceipt(receipt.html, receipt.receipt_number);
    } catch {
      toast.error("Could not load receipt");
    }
  };

  const actions: ActionButton[] = [
    {
      label: "Export CSV",
      icon: <Download className="h-4 w-4" />,
      variant: "outline",
      permissions: [CASHIER_PERMISSIONS.COLLECTIONS_VIEW],
      onClick: async () => {
        try {
          await downloadCollectionsExport({
            from_date: fromDate,
            to_date: toDate,
            search: search.trim() || undefined,
          });
          toast.success("CSV downloaded");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Export failed");
        }
      },
    },
  ];

  return (
    <TableLayout
      title="Daily collections"
      description="Hospital-wide payment ledger across cashiers. Use this for end-of-day reconciliation — not the individual cashier desk."
      showSearch={false}
      filters={[]}
      actions={actions}
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label>From</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <p className="text-2xl font-semibold text-primary">
                {formatBillingCurrency(data?.total_amount ?? 0)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{data?.total ?? 0} payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              By payment method
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {methodSummary.length ? (
              methodSummary.map((row) => (
                <div key={row.method} className="flex justify-between">
                  <span>{formatPaymentMethod(row.method)}</span>
                  <span>{formatBillingCurrency(row.amount)}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              By cashier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {cashierSummary.length ? (
              cashierSummary.map((row) => (
                <div key={row.name} className="flex justify-between">
                  <span>{row.name}</span>
                  <span>{formatBillingCurrency(row.amount)}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payment ledger</CardTitle>
          </CardHeader>
          <CardContent>
            <CashierPaymentLedgerList
              items={data?.results ?? []}
              isLoading={isLoading}
              search={search}
              onSearchChange={setSearch}
              emptyMessage="No payments in this date range."
              selectedId={selected?.payment_id}
              onSelect={setSelected}
              onReprint={handleReprint}
              showCashier
              totalAmount={data?.total_amount}
            />
          </CardContent>
        </Card>

        <Card className="min-h-[320px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payment detail</CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Select a payment to view details.
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                <p className="text-lg font-semibold">{selected.receipt_number}</p>
                <p>{selected.patient_name}</p>
                <p className="text-muted-foreground">{selected.patient_code}</p>
                <p>Cashier: {selected.cashier_name || "—"}</p>
                <p className="font-semibold text-primary">
                  {formatBillingCurrency(selected.amount, selected.currency)}
                </p>
                {selected.account_balance_due != null && selected.account_balance_due > 0 && (
                  <p className="text-amber-700">
                    Visit still has balance:{" "}
                    {formatBillingCurrency(
                      selected.account_balance_due,
                      selected.currency
                    )}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TableLayout>
  );
}
