"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Banknote,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Printer,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionGuard } from "@/components/common/PermissionGuard";
import { formatBillingCurrency, formatBillingDateTime } from "@/features/billing/billingUtils";
import { CashierPaymentLedgerList } from "./CashierPaymentLedgerList";
import {
  useCloseCashierSessionMutation,
  useGetCashierAccountQuery,
  useGetCashierQueueQuery,
  useGetCashierPaymentsTodayQuery,
  useGetCashierPaymentHistoryQuery,
  useGetCurrentCashierSessionQuery,
  useOpenCashierSessionMutation,
  useRecordCashierPaymentMutation,
  useVoidCashierPaymentMutation,
  useLazyGetCashierReceiptQuery,
} from "@/redux/api/cashierApi";
import type { CashierQueueItem, CashierPaymentLedgerItem, PaymentMethod } from "@/redux/types/cashier";
import { printCashierReceipt } from "./cashierReceiptPrint";
import {
  CASHIER_PERMISSIONS,
  PAYMENT_METHOD_OPTIONS,
  formatPaymentMethod,
} from "./cashierUtils";

type TenderFormRow = {
  id: string;
  method: PaymentMethod;
  amount: string;
  reference: string;
  provider: string;
};

function formatToday() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function newId() {
  return crypto.randomUUID();
}

function newTenderRow(amount = ""): TenderFormRow {
  return {
    id: newId(),
    method: "cash",
    amount,
    reference: "",
    provider: "",
  };
}

export function CashierDeskPage() {
  const searchParams = useSearchParams();
  const accountFromUrl = searchParams.get("account");

  const [search, setSearch] = useState("");
  const [scheduleDate, setScheduleDate] = useState(formatToday());
  const [dateFilterEnabled, setDateFilterEnabled] = useState(true);
  const [selected, setSelected] = useState<CashierQueueItem | null>(null);
  const [openSessionOpen, setOpenSessionOpen] = useState(false);
  const [closeSessionOpen, setCloseSessionOpen] = useState(false);
  const [openingFloat, setOpeningFloat] = useState("0");
  const [countedCash, setCountedCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [referenceNote, setReferenceNote] = useState("");
  const [tenders, setTenders] = useState<TenderFormRow[]>([newTenderRow()]);
  const [receiptHtml, setReceiptHtml] = useState<string | null>(null);
  const [receiptTitle, setReceiptTitle] = useState("");
  const [voidPaymentId, setVoidPaymentId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [deskTab, setDeskTab] = useState<"queue" | "paid-today" | "history">(
    "queue"
  );
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [historyFrom, setHistoryFrom] = useState(formatToday());
  const [historyTo, setHistoryTo] = useState(formatToday());
  const [selectedPayment, setSelectedPayment] =
    useState<CashierPaymentLedgerItem | null>(null);

  const { data: session, isLoading: sessionLoading } =
    useGetCurrentCashierSessionQuery();
  const [openSession, { isLoading: openingSession }] =
    useOpenCashierSessionMutation();
  const [closeSession, { isLoading: closingSession }] =
    useCloseCashierSessionMutation();

  const { data: queue, isLoading: queueLoading, refetch: refetchQueue } =
    useGetCashierQueueQuery({
      search: search.trim() || undefined,
      schedule_date: dateFilterEnabled ? scheduleDate : undefined,
      page: 1,
      limit: 50,
    });

  const { data: paidToday, isLoading: paidTodayLoading } =
    useGetCashierPaymentsTodayQuery(
      {
        search: ledgerSearch.trim() || undefined,
        date: scheduleDate,
        page: 1,
        limit: 100,
      },
      { skip: deskTab !== "paid-today" }
    );

  const { data: paymentHistory, isLoading: historyLoading } =
    useGetCashierPaymentHistoryQuery(
      {
        search: ledgerSearch.trim() || undefined,
        from_date: historyFrom,
        to_date: historyTo,
        page: 1,
        limit: 100,
      },
      { skip: deskTab !== "history" }
    );

  const selectedAccountId = selected?.account_id;
  const { data: accountDetail, isLoading: accountLoading } =
    useGetCashierAccountQuery(selectedAccountId!, {
      skip: !selectedAccountId,
    });

  const [recordPayment, { isLoading: paying }] =
    useRecordCashierPaymentMutation();
  const [voidPayment, { isLoading: voiding }] = useVoidCashierPaymentMutation();
  const [fetchReceipt] = useLazyGetCashierReceiptQuery();

  const balanceDue = accountDetail?.account.balance_due ?? selected?.balance_due ?? 0;
  const currency = accountDetail?.account.currency ?? selected?.currency ?? "ETB";

  const tenderTotal = useMemo(
    () =>
      tenders.reduce((sum, row) => {
        const value = row.amount.trim() === "" ? 0 : Number(row.amount);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0),
    [tenders]
  );

  useEffect(() => {
    if (paymentOpen && balanceDue > 0) {
      setTenders([newTenderRow(String(balanceDue))]);
    }
  }, [paymentOpen, balanceDue]);

  useEffect(() => {
    if (!accountFromUrl || !queue?.results.length) return;
    const match = queue.results.find((item) => item.account_id === accountFromUrl);
    if (match) {
      setSelected(match);
      setDeskTab("queue");
    }
  }, [accountFromUrl, queue?.results]);

  const handleOpenSession = async () => {
    try {
      await openSession({
        opening_float: openingFloat.trim() === "" ? 0 : Number(openingFloat),
      }).unwrap();
      toast.success("Cashier session opened");
      setOpenSessionOpen(false);
      setOpeningFloat("0");
    } catch (err: unknown) {
      toast.error(
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Could not open session"
      );
    }
  };

  const handleCloseSession = async () => {
    if (!session) return;
    try {
      await closeSession({
        sessionId: session.session_id,
        counted_cash_total: Number(countedCash),
        close_notes: closeNotes || undefined,
      }).unwrap();
      toast.success("Cashier session closed");
      setCloseSessionOpen(false);
      setCountedCash("");
      setCloseNotes("");
      setSelected(null);
    } catch (err: unknown) {
      toast.error(
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Could not close session"
      );
    }
  };

  const handleCollectPayment = async () => {
    if (!selectedAccountId) return;
    if (tenderTotal <= 0) {
      toast.error("Enter a payment amount");
      return;
    }
    if (tenderTotal > balanceDue) {
      toast.error("Payment exceeds balance due");
      return;
    }

    try {
      const receipt = await recordPayment({
        accountId: selectedAccountId,
        body: {
          amount: tenderTotal,
          reference_note: referenceNote || undefined,
          client_reference: newId(),
          tenders: tenders.map((row) => ({
            method: row.method,
            amount: Number(row.amount),
            reference: row.reference || undefined,
            provider: row.provider || undefined,
          })),
        },
      }).unwrap();
      toast.success(`Payment recorded · ${receipt.receipt_number}`);
      setPaymentOpen(false);
      setReferenceNote("");
      setReceiptHtml(receipt.html);
      setReceiptTitle(receipt.receipt_number);
      refetchQueue();
      if (receipt.balance_due <= 0) {
        setSelected(null);
      }
    } catch (err: unknown) {
      toast.error(
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Payment failed"
      );
    }
  };

  const handleVoidPayment = async () => {
    if (!voidPaymentId || !selectedAccountId) return;
    try {
      await voidPayment({
        paymentId: voidPaymentId,
        reason: voidReason,
        accountId: selectedAccountId,
      }).unwrap();
      toast.success("Payment voided");
      setVoidPaymentId(null);
      setVoidReason("");
      refetchQueue();
    } catch (err: unknown) {
      toast.error(
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Void failed"
      );
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-primary" />
              Cashier desk
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Collect payments for visit bills. Open a session before taking payment.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {sessionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : session ? (
              <>
                <Badge variant="default">Session open</Badge>
                <span className="text-sm text-muted-foreground">
                  Float {formatBillingCurrency(session.opening_float, currency)}
                </span>
                <PermissionGuard
                  requireAll={[CASHIER_PERMISSIONS.SESSION_CLOSE]}
                  fallback={null}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCloseSessionOpen(true)}
                  >
                    Close session
                  </Button>
                </PermissionGuard>
              </>
            ) : (
              <PermissionGuard
                requireAll={[CASHIER_PERMISSIONS.SESSION_OPEN]}
                fallback={null}
              >
                <Button size="sm" onClick={() => setOpenSessionOpen(true)}>
                  Open session
                </Button>
              </PermissionGuard>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <Tabs
              value={deskTab}
              onValueChange={(v) => {
                setDeskTab(v as typeof deskTab);
                setSelected(null);
                setSelectedPayment(null);
                setLedgerSearch("");
              }}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="queue">Queue</TabsTrigger>
                <TabsTrigger value="paid-today">Paid today</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="space-y-3">
            {deskTab === "queue" && (
              <>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Previous day"
                  disabled={!dateFilterEnabled}
                  onClick={() => setScheduleDate((d) => addDays(d, -1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="date"
                    value={scheduleDate}
                    disabled={!dateFilterEnabled}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-[11rem] pl-9"
                    aria-label="Pick visit date"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Next day"
                  disabled={!dateFilterEnabled}
                  onClick={() => setScheduleDate((d) => addDays(d, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 border-l pl-2 ml-1">
                <Switch
                  id="cashier-date-filter"
                  checked={dateFilterEnabled}
                  onCheckedChange={setDateFilterEnabled}
                />
                <Label
                  htmlFor="cashier-date-filter"
                  className="text-sm font-normal cursor-pointer"
                >
                  Filter by date
                </Label>
              </div>
              {!dateFilterEnabled && (
                <span className="text-xs text-muted-foreground">
                  Showing all dates
                </span>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={
                  dateFilterEnabled
                    ? "Search this day (name, patient ID, phone)…"
                    : "Search all (name, patient ID, phone)…"
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {queueLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !queue?.results.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {dateFilterEnabled
                  ? "No unpaid bills for this day."
                  : "No unpaid bills in the queue."}
              </p>
            ) : (
              <ul className="max-h-[520px] space-y-2 overflow-y-auto">
                {queue.results.map((item) => (
                  <li key={item.account_id}>
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        selected?.account_id === item.account_id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{item.patient_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.patient_code || "—"}
                            {item.schedule_time ? ` · ${item.schedule_time}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-primary">
                            {formatBillingCurrency(item.balance_due, item.currency)}
                          </p>
                          <Badge variant="outline" className="mt-1 capitalize text-[10px]">
                            {item.status.replace(/_/g, " ")}
                          </Badge>
                          {item.pending_collection_request ? (
                            <Badge variant="default" className="mt-1 block text-[10px]">
                              Sent to cashier
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
              </>
            )}

            {deskTab === "paid-today" && (
              <CashierPaymentLedgerList
                items={paidToday?.results ?? []}
                isLoading={paidTodayLoading}
                search={ledgerSearch}
                onSearchChange={setLedgerSearch}
                searchPlaceholder="Search today's receipts…"
                emptyMessage="No payments recorded today."
                selectedId={selectedPayment?.payment_id}
                onSelect={setSelectedPayment}
                onReprint={async (paymentId) => {
                  try {
                    const receipt = await fetchReceipt(paymentId).unwrap();
                    setReceiptHtml(receipt.html);
                    setReceiptTitle(receipt.receipt_number);
                  } catch {
                    toast.error("Could not load receipt");
                  }
                }}
                totalAmount={paidToday?.total_amount}
              />
            )}

            {deskTab === "history" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Input
                      type="date"
                      value={historyFrom}
                      onChange={(e) => setHistoryFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Input
                      type="date"
                      value={historyTo}
                      onChange={(e) => setHistoryTo(e.target.value)}
                    />
                  </div>
                </div>
                <CashierPaymentLedgerList
                  items={paymentHistory?.results ?? []}
                  isLoading={historyLoading}
                  search={ledgerSearch}
                  onSearchChange={setLedgerSearch}
                  emptyMessage="No payments in this range."
                  selectedId={selectedPayment?.payment_id}
                  onSelect={setSelectedPayment}
                  onReprint={async (paymentId) => {
                    try {
                      const receipt = await fetchReceipt(paymentId).unwrap();
                      setReceiptHtml(receipt.html);
                      setReceiptTitle(receipt.receipt_number);
                    } catch {
                      toast.error("Could not load receipt");
                    }
                  }}
                  showCashier
                  totalAmount={paymentHistory?.total_amount}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[420px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {deskTab === "queue" ? "Bill details" : "Payment detail"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deskTab !== "queue" ? (
              !selectedPayment ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  Select a payment to view details or reprint the receipt.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-lg font-semibold">
                      {selectedPayment.patient_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPayment.receipt_number}
                      {selectedPayment.patient_code
                        ? ` · ${selectedPayment.patient_code}`
                        : ""}
                    </p>
                    <p className="mt-2 text-sm">
                      Cashier: {selectedPayment.cashier_name || "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatBillingDateTime(selectedPayment.created_at)}
                    </p>
                    <p className="mt-3 text-xl font-semibold text-primary">
                      {formatBillingCurrency(
                        selectedPayment.amount,
                        selectedPayment.currency
                      )}
                    </p>
                    {selectedPayment.account_balance_due != null &&
                      selectedPayment.account_balance_due > 0 && (
                        <p className="mt-2 text-sm text-amber-700">
                          Visit balance remaining:{" "}
                          {formatBillingCurrency(
                            selectedPayment.account_balance_due,
                            selectedPayment.currency
                          )}
                        </p>
                      )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const receipt = await fetchReceipt(
                          selectedPayment.payment_id
                        ).unwrap();
                        setReceiptHtml(receipt.html);
                        setReceiptTitle(receipt.receipt_number);
                      } catch {
                        toast.error("Could not load receipt");
                      }
                    }}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Reprint receipt
                  </Button>
                </div>
              )
            ) : !selected ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Select a patient from the queue to review their bill.
              </p>
            ) : accountLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : accountDetail ? (
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">
                        {accountDetail.account.patient?.full_name ||
                          selected.patient_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {accountDetail.account.patient?.patientProfile?.patient_code ||
                          selected.patient_code}
                        {accountDetail.account.patient?.phone_number
                          ? ` · ${accountDetail.account.patient.phone_number}`
                          : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Admitted{" "}
                        {formatBillingDateTime(
                          accountDetail.account.appointment?.admitted_at ||
                            selected.admitted_at ||
                            ""
                        )}
                      </p>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {accountDetail.account.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  {accountDetail.entries.map((entry) => (
                    <div
                      key={entry.entry_id}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">{entry.service_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.quantity} ×{" "}
                          {formatBillingCurrency(entry.unit_price, currency)}
                        </p>
                      </div>
                      <p className="font-medium">
                        {formatBillingCurrency(entry.line_total, currency)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex justify-between text-sm">
                      <span>Bill total</span>
                      <span>
                        {formatBillingCurrency(
                          accountDetail.account.grand_total,
                          currency
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Paid</span>
                      <span>
                        {formatBillingCurrency(
                          accountDetail.account.amount_paid,
                          currency
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-primary sm:col-span-2">
                      <span>Balance due</span>
                      <span>
                        {formatBillingCurrency(
                          accountDetail.account.balance_due,
                          currency
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {accountDetail.payments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Payment history</p>
                    {accountDetail.payments.map((payment) => (
                      <div
                        key={payment.payment_id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">{payment.receipt_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.tenders
                              .map(
                                (t) =>
                                  `${formatPaymentMethod(t.method)} ${formatBillingCurrency(t.amount, currency)}`
                              )
                              .join(" · ")}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                const receipt = await fetchReceipt(
                                  payment.payment_id
                                ).unwrap();
                                setReceiptHtml(receipt.html);
                                setReceiptTitle(receipt.receipt_number);
                              } catch {
                                toast.error("Could not load receipt");
                              }
                            }}
                          >
                            <Printer className="mr-1 h-3.5 w-3.5" />
                            Reprint
                          </Button>
                          <PermissionGuard
                            requireAll={[CASHIER_PERMISSIONS.PAYMENT_VOID]}
                            fallback={null}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setVoidPaymentId(payment.payment_id)}
                            >
                              Void
                            </Button>
                          </PermissionGuard>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <PermissionGuard
                  requireAll={[CASHIER_PERMISSIONS.PAYMENT_CREATE]}
                  fallback={null}
                >
                  <Button
                    className="w-full sm:w-auto"
                    disabled={!session || balanceDue <= 0}
                    onClick={() => setPaymentOpen(true)}
                  >
                    <Banknote className="mr-1.5 h-4 w-4" />
                    Collect payment
                  </Button>
                </PermissionGuard>
                {!session && balanceDue > 0 && (
                  <p className="text-xs text-amber-700">
                    Open a cashier session before collecting payment.
                  </p>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={openSessionOpen} onOpenChange={setOpenSessionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open cashier session</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Opening float (cash in drawer)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                className="mt-1"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSessionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleOpenSession} disabled={openingSession}>
              Open session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeSessionOpen} onOpenChange={setCloseSessionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close cashier session</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Counted cash in drawer</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                className="mt-1"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                className="mt-1"
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseSessionOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCloseSession}
              disabled={closingSession || countedCash.trim() === ""}
            >
              Close session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Collect payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Balance due:{" "}
              <span className="font-semibold text-foreground">
                {formatBillingCurrency(balanceDue, currency)}
              </span>
            </p>

            {tenders.map((row, index) => (
              <div key={row.id} className="grid gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <Label>Method {index + 1}</Label>
                  {tenders.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        setTenders((rows) => rows.filter((r) => r.id !== row.id))
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <Select
                  value={row.method}
                  onValueChange={(v) =>
                    setTenders((rows) =>
                      rows.map((r) =>
                        r.id === row.id ? { ...r, method: v as PaymentMethod } : r
                      )
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHOD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0.01}
                  step="0.01"
                  placeholder="Amount"
                  value={row.amount}
                  onChange={(e) =>
                    setTenders((rows) =>
                      rows.map((r) =>
                        r.id === row.id ? { ...r, amount: e.target.value } : r
                      )
                    )
                  }
                />
                {row.method !== "cash" && (
                  <>
                    <Input
                      placeholder="Reference / transaction ID"
                      value={row.reference}
                      onChange={(e) =>
                        setTenders((rows) =>
                          rows.map((r) =>
                            r.id === row.id ? { ...r, reference: e.target.value } : r
                          )
                        )
                      }
                    />
                    {row.method === "mobile_money" && (
                      <Input
                        placeholder="Provider (e.g. Telebirr)"
                        value={row.provider}
                        onChange={(e) =>
                          setTenders((rows) =>
                            rows.map((r) =>
                              r.id === row.id ? { ...r, provider: e.target.value } : r
                            )
                          )
                        }
                      />
                    )}
                  </>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTenders((rows) => [...rows, newTenderRow()])}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Split payment method
            </Button>

            <div className="flex justify-between text-sm font-medium">
              <span>Total tender</span>
              <span>{formatBillingCurrency(tenderTotal, currency)}</span>
            </div>

            <div>
              <Label>Note (optional)</Label>
              <Input
                className="mt-1"
                value={referenceNote}
                onChange={(e) => setReferenceNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCollectPayment} disabled={paying}>
              Record payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(receiptHtml)} onOpenChange={() => setReceiptHtml(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Receipt {receiptTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Payment recorded successfully. Print the receipt for the patient.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptHtml(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (receiptHtml) {
                  try {
                    printCashierReceipt(receiptHtml, receiptTitle);
                  } catch (err) {
                    toast.error(
                      err instanceof Error ? err.message : "Print failed"
                    );
                  }
                }
              }}
            >
              <Printer className="mr-1.5 h-4 w-4" />
              Print receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(voidPaymentId)} onOpenChange={() => setVoidPaymentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void payment</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Reason</Label>
            <Textarea
              className="mt-1"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidPaymentId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={voidReason.trim().length < 3 || voiding}
              onClick={handleVoidPayment}
            >
              Void payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
