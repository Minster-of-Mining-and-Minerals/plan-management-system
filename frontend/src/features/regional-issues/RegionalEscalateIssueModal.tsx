"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEscalateRegionalIssueMutation } from "@/redux/api/regionalIssueApi";
import { ArrowUpRight, AlertTriangle, ShieldAlert } from "lucide-react";

interface RegionalEscalateIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  regionId: string;
  issueId: string;
  issueNumber: string;
  onEscalated?: () => void;
}

export function RegionalEscalateIssueModal({
  isOpen,
  onClose,
  regionId,
  issueId,
  issueNumber,
  onEscalated,
}: RegionalEscalateIssueModalProps) {
  const [escalateIssue, { isLoading }] = useEscalateRegionalIssueMutation();

  const [assistanceType, setAssistanceType] = useState("technical_support");
  const [priority, setPriority] = useState("high");
  const [escalationReason, setEscalationReason] = useState("");
  const [requestedAssistance, setRequestedAssistance] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalationReason.trim()) {
      setErrorMsg("Escalation reason is required.");
      return;
    }
    if (!requestedAssistance.trim()) {
      setErrorMsg("Requested assistance explanation is required.");
      return;
    }

    try {
      setErrorMsg("");
      await escalateIssue({
        regionId,
        issueId,
        assistance_type: assistanceType,
        escalation_priority: priority,
        escalation_reason: escalationReason.trim(),
        requested_assistance: requestedAssistance.trim(),
      }).unwrap();

      onEscalated?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err.message || "Failed to escalate issue to Federal.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-purple-700">
            <ArrowUpRight className="h-5 w-5" />
            <DialogTitle>Escalate Issue to Federal Ministry</DialogTitle>
          </div>
          <DialogDescription>
            Formal inter-governmental escalation for Regional Issue <span className="font-mono font-semibold">{issueNumber}</span>.
            The Federal team will receive this briefing in their Regional Issues oversight desk.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Assistance Type</Label>
              <Select value={assistanceType} onValueChange={setAssistanceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical_support">Technical Support</SelectItem>
                  <SelectItem value="policy_clarification">Policy Clarification</SelectItem>
                  <SelectItem value="legal_clarification">Legal Clarification</SelectItem>
                  <SelectItem value="financial_intervention">Financial Intervention</SelectItem>
                  <SelectItem value="security_assistance">Security Assistance</SelectItem>
                  <SelectItem value="other">Other Assistance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Escalation Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Escalation Reason <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              placeholder="Why does this issue require Federal intervention? What challenges were encountered at the regional level?"
              value={escalationReason}
              onChange={(e) => setEscalationReason(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Requested Federal Assistance <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              placeholder="Specify the exact support, decisions, or resources required from the Federal Ministry..."
              value={requestedAssistance}
              onChange={(e) => setRequestedAssistance(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="p-3 bg-purple-50/70 border border-purple-200 rounded text-xs text-purple-900 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <ShieldAlert className="h-4 w-4 text-purple-700" />
              <span>Federal Privacy Invariant</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Your internal regional notes remain shielded. Federal will only receive this briefing and any documents you explicitly forward.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-purple-700 hover:bg-purple-800 text-white"
            >
              <ArrowUpRight className="h-4 w-4 mr-1.5" />
              {isLoading ? "Submitting Escalation..." : "Confirm Escalation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

