"use client";

import { useState } from "react";
import { ChevronDown, Plus, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PermissionGuard } from "@/components/common/PermissionGuard";
import Loading01 from "@/features/template/component/Loading/Loading01";
import {
  useCancelAppointmentBillingEntryMutation,
  useCreateAppointmentBillingEntryMutation,
  useGetAppointmentBillingQuery,
  useListAppointmentBillingServicesQuery,
} from "@/redux/api/appointmentBillingApi";
import type { AppointmentBillingEntry } from "@/redux/types/billing";
import { BILLING_PERMISSIONS, formatBillingCurrency, formatBillingDateTime } from "./billingUtils";

type Props = {
  appointmentId: string;
  disabled?: boolean;
};

type BillingEntryRowProps = {
  entry: AppointmentBillingEntry;
  currency: string;
  disabled?: boolean;
  defaultOpen?: boolean;
  onRemove: (entryId: string) => void;
};

function BillingEntryRow({
  entry,
  currency,
  disabled,
  defaultOpen = false,
  onRemove,
}: BillingEntryRowProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <li>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-start gap-2 p-3 text-left transition-colors duration-300 ease-in-out",
                open ? "bg-muted/40" : "hover:bg-muted/30"
              )}
            >
              <ChevronDown
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-in-out",
                  open && "rotate-180"
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{entry.service_name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatBillingDateTime(entry.created_at)}
                      {entry.added_by_name ? ` · ${entry.added_by_name}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-primary">
                    {formatBillingCurrency(entry.line_total, currency)}
                  </p>
                </div>
              </div>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="space-y-3 border-t border-border/60 px-3 py-3">
              <p className="text-xs text-muted-foreground">
                {entry.department_name || entry.added_by_department
                  ? entry.department_name || entry.added_by_department
                  : null}
              </p>
              {entry.note ? (
                <p className="text-xs rounded-md bg-muted/50 p-2">{entry.note}</p>
              ) : null}
              <div className="flex flex-wrap items-end justify-between gap-3 text-sm">
                <div className="text-muted-foreground">
                  <p>
                    {entry.quantity} × {formatBillingCurrency(entry.unit_price, currency)}
                  </p>
                  <p>
                    Tax: {formatBillingCurrency(entry.line_tax_amount, currency)}
                    {Number(entry.tax_percent) === 0 ? " (0%)" : ""}
                  </p>
                </div>
                {!disabled && (
                  <PermissionGuard
                    requireAll={[BILLING_PERMISSIONS.APPOINTMENT_DELETE]}
                    fallback={null}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => onRemove(entry.entry_id)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </PermissionGuard>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </li>
  );
}

export function AppointmentBillingCard({ appointmentId, disabled }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");

  const { data, isLoading, refetch } = useGetAppointmentBillingQuery(appointmentId);
  const { data: services = [] } = useListAppointmentBillingServicesQuery(undefined, {
    skip: !addOpen,
  });
  const [createEntry, { isLoading: creating }] =
    useCreateAppointmentBillingEntryMutation();
  const [cancelEntry] = useCancelAppointmentBillingEntryMutation();

  const activeEntries = (data?.entries ?? []).filter((e) => e.status === "active");
  const summary = data?.summary;
  const currency = data?.account?.currency || "ETB";

  const handleAdd = async () => {
    if (!serviceId) {
      toast.error("Select a service");
      return;
    }
    try {
      await createEntry({
        appointmentId,
        body: {
          service_id: serviceId,
          quantity: Number(quantity),
          note: note || undefined,
        },
      }).unwrap();
      toast.success("Billing entry added");
      setAddOpen(false);
      setServiceId("");
      setQuantity("1");
      setNote("");
      refetch();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Could not add billing entry";
      toast.error(message);
    }
  };

  const handleRemove = async (entryId: string) => {
    try {
      await cancelEntry({ entryId, appointmentId }).unwrap();
      toast.success("Billing entry removed");
      refetch();
    } catch {
      toast.error("Could not remove entry");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Billing
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Services billed during this visit. Expand an entry for line details.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data?.account?.status ? (
            <Badge variant="secondary" className="capitalize">
              {data.account.status.replace(/_/g, " ")}
            </Badge>
          ) : null}
          {!disabled && (
            <PermissionGuard
              requireAll={[BILLING_PERMISSIONS.APPOINTMENT_CREATE]}
              fallback={null}
            >
              <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add Billing
              </Button>
            </PermissionGuard>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <Loading01 />
        ) : activeEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No billing entries yet. Services added during this visit will appear here.
          </p>
        ) : (
          <ul className="space-y-3">
            {activeEntries.map((entry, index) => (
              <BillingEntryRow
                key={entry.entry_id}
                entry={entry}
                currency={currency}
                disabled={disabled}
                defaultOpen={index === 0}
                onRemove={handleRemove}
              />
            ))}
          </ul>
        )}

        {summary ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatBillingCurrency(summary.subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Discounts</span>
                <span>{formatBillingCurrency(summary.discount_total, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>{formatBillingCurrency(summary.tax_total, currency)}</span>
              </div>
              <div className="flex justify-between font-semibold text-primary">
                <span>Grand total</span>
                <span>{formatBillingCurrency(summary.grand_total, currency)}</span>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add billing entry</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Service</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select active service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.service_id} value={service.service_id}>
                      {service.name}
                      {service.total_amount
                        ? ` — ${formatBillingCurrency(service.total_amount, service.currency)}`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min={0.01}
                step="1"
                className="mt-1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input
                className="mt-1"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={creating}>
              Add entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
