"use client";

import { useMemo, useState } from "react";
import { Search, Send } from "lucide-react";
import { toast } from "sonner";
import { AppointmentSidePanelShell } from "../components/AppointmentSidePanelShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { WorkflowReceiver } from "@/redux/api/medicalWorkflowApi";

const panelTextareaClass =
  "w-full min-h-[4.5rem] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

function userInitials(name: string) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type Props = {
  receivers: WorkflowReceiver[];
  currentUserId?: string;
  fromStaffName?: string;
  onClose?: () => void;
  onConfirm: (receiverId: string, forwardNote?: string) => void;
  isSubmitting?: boolean;
};

export function ForwardPreview({
  receivers,
  currentUserId,
  fromStaffName,
  onClose,
  onConfirm,
  isSubmitting,
}: Props) {
  const [userSearch, setUserSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [forwardNote, setForwardNote] = useState("");

  const eligibleReceivers = useMemo(
    () =>
      receivers.filter(
        (u) => u.user_id && (!currentUserId || u.user_id !== currentUserId)
      ),
    [receivers, currentUserId]
  );

  const filtered = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return eligibleReceivers;
    return eligibleReceivers.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.internalProfile?.departmentRef?.name || "").toLowerCase().includes(q)
    );
  }, [eligibleReceivers, userSearch]);

  const handleConfirm = () => {
    if (currentUserId && selectedId === currentUserId) {
      toast.error("You cannot forward a patient to yourself");
      return;
    }
    if (!selectedId) return;
    onConfirm(selectedId, forwardNote.trim() || undefined);
  };

  return (
    <AppointmentSidePanelShell
      title="Forward to staff"
      subtitle={
        fromStaffName
          ? `${fromStaffName} → select receiving staff`
          : "Forward patient data to a specific user"
      }
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selectedId || isSubmitting}
            onClick={handleConfirm}
          >
            <Send className="mr-1.5 h-4 w-4" />
            {isSubmitting ? "Forwarding…" : "Confirm forward"}
          </Button>
        </div>
      }
    >
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search staff…"
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
          No eligible staff with receive-patient permission found.
        </p>
      ) : (
        <ul className="space-y-2 pr-1">
          {filtered.map((u) => {
            const selected = selectedId === u.user_id;
            const dept = u.internalProfile?.departmentRef?.name;
            return (
              <li key={u.user_id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(u.user_id)}
                  className={cn(
                    "flex w-full gap-3 rounded-xl border p-3 text-left shadow-sm transition-all",
                    selected
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-primary/30 hover:shadow-md"
                  )}
                >
                  <Avatar className="h-10 w-10 shrink-0 rounded-lg">
                    <AvatarFallback className="rounded-lg text-xs">
                      {userInitials(u.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{u.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {dept || "—"}
                      {u.internalProfile?.titleRef?.name
                        ? ` · ${u.internalProfile.titleRef.name}`
                        : ""}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-2">
        <Label>Forward note (optional)</Label>
        <textarea
          className={panelTextareaClass}
          placeholder="Message for the receiving staff"
          value={forwardNote}
          onChange={(e) => setForwardNote(e.target.value)}
        />
      </div>

    </AppointmentSidePanelShell>
  );
}
