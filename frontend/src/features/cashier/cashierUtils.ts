import type { PaymentMethod } from "@/redux/types/cashier";

export const CASHIER_PERMISSIONS = {
  SESSION_OPEN: "CASHIER_SESSION:OPEN",
  SESSION_CLOSE: "CASHIER_SESSION:CLOSE",
  SESSION_VIEW: "CASHIER_SESSION:VIEW",
  PAYMENT_CREATE: "CASHIER_PAYMENT:CREATE",
  PAYMENT_VIEW: "CASHIER_PAYMENT:VIEW",
  PAYMENT_VOID: "CASHIER_PAYMENT:VOID",
  QUEUE_VIEW: "CASHIER_QUEUE:VIEW",
  COLLECTIONS_VIEW: "FINANCE_COLLECTIONS:VIEW",
  RECEIPT_TEMPLATE_VIEW: "RECEIPT_TEMPLATE:VIEW",
  RECEIPT_TEMPLATE_CREATE: "RECEIPT_TEMPLATE:CREATE",
  RECEIPT_TEMPLATE_UPDATE: "RECEIPT_TEMPLATE:UPDATE",
  RECEIPT_TEMPLATE_DELETE: "RECEIPT_TEMPLATE:DELETE",
} as const;

export const PAYMENT_METHOD_OPTIONS: Array<{
  value: PaymentMethod;
  label: string;
}> = [
  { value: "cash", label: "Cash" },
  { value: "mobile_money", label: "Mobile money" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "other", label: "Other" },
];

export function formatPaymentMethod(method: string) {
  return (
    PAYMENT_METHOD_OPTIONS.find((o) => o.value === method)?.label ||
    method.replace(/_/g, " ")
  );
}

export function billingStatusLabel(status?: string | null) {
  if (!status || status === "draft") return null;
  return status.replace(/_/g, " ");
}

export function isUnpaidBillingStatus(status?: string | null) {
  return status === "pending_payment" || status === "partially_paid";
}
