"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Check, Pill, Send } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { AppointmentSidePanelShell } from "@/features/medical-workflow/components/AppointmentSidePanelShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  useGetActivePharmaciesQuery,
  useGetSchedulePrescriptionsForPharmacyQuery,
  useForwardPrescriptionsFromScheduleMutation,
} from "@/redux/api/pharmacyApi";
import type { SchedulePrescriptionForPharmacy } from "@/redux/types/pharmacy";

type Props = {
  scheduleId: string;
  patientName?: string;
  onClose: () => void;
  onSent?: () => void;
};

function prescriptionLabel(rx: SchedulePrescriptionForPharmacy, index: number) {
  return rx.header_title?.trim() || `Prescription #${index + 1}`;
}

function isForwarded(rx: SchedulePrescriptionForPharmacy) {
  return Boolean(rx.pharmacy_forward?.forward_id || rx.pharmacy_forward?.is_forwarded);
}

function buildInitialSelection(prescriptions: SchedulePrescriptionForPharmacy[]) {
  const forwarded = prescriptions.filter(isForwarded);
  const selectedIds =
    forwarded.length > 0
      ? forwarded.map((rx) => rx.prescription_id)
      : prescriptions.map((rx) => rx.prescription_id);

  const pharmacyId =
    forwarded.find((rx) => rx.pharmacy_forward?.pharmacy_id)?.pharmacy_forward
      ?.pharmacy_id ?? "";

  return { selectedIds, pharmacyId };
}

export function SendToPharmacyDrawer({
  scheduleId,
  patientName,
  onClose,
  onSent,
}: Props) {
  const { data, isLoading, refetch } =
    useGetSchedulePrescriptionsForPharmacyQuery(scheduleId);
  const { data: pharmacies = [], isLoading: loadingPharmacies } =
    useGetActivePharmaciesQuery();
  const [forwardPrescriptions, { isLoading: sending }] =
    useForwardPrescriptionsFromScheduleMutation();

  const prescriptions = data?.prescriptions ?? [];
  const [initialized, setInitialized] = useState(false);
  const [pharmacyId, setPharmacyId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!data?.prescriptions?.length || initialized) return;
    const { selectedIds: ids, pharmacyId: pid } = buildInitialSelection(
      data.prescriptions
    );
    setSelectedIds(ids);
    setPharmacyId(pid);
    setInitialized(true);
  }, [data, initialized]);


  const selectedPrescriptions = useMemo(
    () => prescriptions.filter((rx) => selectedIds.includes(rx.prescription_id)),
    [prescriptions, selectedIds]
  );

  const allSelectedForwarded =
    selectedPrescriptions.length > 0 &&
    selectedPrescriptions.every((rx) => isForwarded(rx));

  const togglePrescription = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const handleSend = async () => {
    if (!pharmacyId) {
      toast.error("Select a pharmacy");
      return;
    }
    if (selectedIds.length === 0) {
      toast.error("Select at least one prescription");
      return;
    }
    try {
      const result = await forwardPrescriptions({
        schedule_id: scheduleId,
        prescription_ids: selectedIds,
        pharmacy_id: pharmacyId,
      }).unwrap();

      const created = result.forwarded.filter((f) => !f.updated).length;
      const updated = result.forwarded.filter((f) => f.updated).length;

      if (result.failed.length > 0 && result.forwarded.length > 0) {
        toast.warning(
          `${result.forwarded.length} processed, ${result.failed.length} failed`
        );
      } else if (result.failed.length > 0) {
        toast.error(result.failed[0]?.message || "Failed to forward");
        return;
      } else if (updated > 0 && created === 0) {
        toast.success(
          updated === 1
            ? "Pharmacy forwarding updated"
            : `${updated} pharmacy forwardings updated`
        );
      } else if (created > 0 && updated > 0) {
        toast.success(`${created} sent, ${updated} updated`);
      } else {
        toast.success(
          created === 1
            ? "Prescription forwarded to pharmacy"
            : `${created} prescriptions forwarded to pharmacy`
        );
      }

      await refetch();
      onSent?.();
      if (result.failed.length === 0) {
        onClose();
      } else {
        setSelectedIds(result.failed.map((f) => f.prescription_id));
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Failed to forward prescriptions";
      toast.error(message);
    }
  };

  const busy = isLoading || loadingPharmacies || sending;

  const primaryLabel = sending
    ? "Saving…"
    : allSelectedForwarded
      ? "Update forwarding"
      : selectedIds.length > 1
        ? `Send ${selectedIds.length} prescriptions`
        : "Send prescription";

  const title = allSelectedForwarded
    ? "Manage pharmacy forwarding"
    : "Send to pharmacy";

  return (
    <AppointmentSidePanelShell
      title={title}
      subtitle={
        patientName
          ? patientName
          : allSelectedForwarded
            ? "Change pharmacy or prescriptions already forwarded"
            : "Select pharmacy and prescriptions"
      }
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!pharmacyId || selectedIds.length === 0 || sending}
            onClick={handleSend}
          >
            <Send className="mr-1.5 h-4 w-4" />
            {primaryLabel}
          </Button>
        </div>
      }
    >
      {busy && prescriptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : prescriptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No issued prescriptions for this visit yet.
        </p>
      ) : (
        <>
          <section className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Building2 className="h-4 w-4 text-primary" />
              Pharmacy
            </Label>
            <div className="space-y-2">
              {pharmacies.map((p) => (
                <button
                  key={p.pharmacy_id}
                  type="button"
                  onClick={() => setPharmacyId(p.pharmacy_id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    pharmacyId === p.pharmacy_id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <p className="font-medium">{p.pharmacy_name}</p>
                  <p className="text-xs text-muted-foreground">{p.pharmacy_code}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Pill className="h-4 w-4 text-primary" />
              Prescriptions
            </Label>
            <div className="space-y-2">
              {prescriptions.map((rx, index) => {
                const selected = selectedIds.includes(rx.prescription_id);
                const forwarded = isForwarded(rx);

                return (
                  <button
                    key={rx.prescription_id}
                    type="button"
                    onClick={() => togglePrescription(rx.prescription_id)}
                    className={cn(
                      "flex w-full gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40 bg-background"
                      )}
                      aria-hidden
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <p className="font-medium">{prescriptionLabel(rx, index)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {rx.item_count} item{rx.item_count === 1 ? "" : "s"}
                        {forwarded && rx.pharmacy_forward?.pharmacy_name
                          ? ` · ${rx.pharmacy_forward.pharmacy_name}`
                          : ""}
                      </p>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}
    </AppointmentSidePanelShell>
  );
}

export function SendToPharmacyDrawerHost(props: Props & { open: boolean }) {
  const { open, ...drawerProps } = props;
  return (
    <AnimatePresence>
      {open && <SendToPharmacyDrawer {...drawerProps} />}
    </AnimatePresence>
  );
}
