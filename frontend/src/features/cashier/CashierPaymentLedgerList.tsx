"use client";

import { Loader2, Printer, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBillingCurrency, formatBillingDateTime } from "@/features/billing/billingUtils";
import type { CashierPaymentLedgerItem } from "@/redux/types/cashier";
import { formatPaymentMethod } from "./cashierUtils";

type Props = {
  items: CashierPaymentLedgerItem[];
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  emptyMessage: string;
  selectedId?: string | null;
  onSelect: (item: CashierPaymentLedgerItem) => void;
  onReprint?: (paymentId: string) => void;
  showCashier?: boolean;
  totalAmount?: number;
  currency?: string;
};

export function CashierPaymentLedgerList({
  items,
  isLoading,
  search,
  onSearchChange,
  searchPlaceholder = "Search receipt, patient, cashier…",
  emptyMessage,
  selectedId,
  onSelect,
  onReprint,
  showCashier = false,
  totalAmount,
  currency = "ETB",
}: Props) {
  return (
    <div className="space-y-3">
      {totalAmount != null && (
        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Total collected: </span>
          <span className="font-semibold text-primary">
            {formatBillingCurrency(totalAmount, currency)}
          </span>
          <span className="ml-2 text-muted-foreground">({items.length} shown)</span>
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !items.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="max-h-[520px] space-y-2 overflow-y-auto">
          {items.map((item) => (
            <li key={item.payment_id}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  selectedId === item.payment_id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.patient_name || "Patient"}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.receipt_number}
                      {item.patient_code ? ` · ${item.patient_code}` : ""}
                    </p>
                    {showCashier && item.cashier_name && (
                      <p className="text-xs text-muted-foreground">
                        Cashier: {item.cashier_name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatBillingDateTime(item.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">
                      {formatBillingCurrency(item.amount, item.currency)}
                    </p>
                    {item.account_balance_due != null && item.account_balance_due > 0 ? (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        Balance {formatBillingCurrency(item.account_balance_due, item.currency)}
                      </Badge>
                    ) : (
                      <Badge variant="default" className="mt-1 text-[10px]">
                        Settled
                      </Badge>
                    )}
                    {onReprint && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-1 h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReprint(item.payment_id);
                        }}
                        title="Reprint receipt"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.tenders
                    .map(
                      (t) =>
                        `${formatPaymentMethod(t.method)} ${formatBillingCurrency(t.amount, item.currency)}`
                    )
                    .join(" · ")}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
