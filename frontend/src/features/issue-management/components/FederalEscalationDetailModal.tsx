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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  useGetFederalRegionalEscalationByIdQuery,
  useStartFederalReviewMutation,
  useRequestFederalClarificationMutation,
  useProvideFederalAssistanceMutation,
  useReturnFederalEscalationToRegionMutation,
  useCloseFederalInterventionMutation,
  useAddFederalEscalationMessageMutation,
  FederalRegionalEscalationItem,
} from "@/redux/api/federalRegionalEscalationApi";
import {
  RegionalIssueStatusBadge,
  RegionalEscalationStatusBadge,
} from "@/features/regional-issues/RegionalIssueStatusBadge";
import {
  PlayCircle,
  HelpCircle,
  CheckCircle2,
  RotateCcw,
  Archive,
  Send,
  MessageSquare,
  Building,
  User,
  Calendar,
  AlertTriangle,
  Lock,
  Paperclip,
  Download,
} from "lucide-react";
import { format } from "date-fns";

interface FederalEscalationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  escalationId: string | null;
  onRefresh?: () => void;
}

export function FederalEscalationDetailModal({
  isOpen,
  onClose,
  escalationId,
  onRefresh,
}: FederalEscalationDetailModalProps) {
  const { data: escalation, isLoading, refetch } = useGetFederalRegionalEscalationByIdQuery(
    escalationId || "",
    { skip: !escalationId || !isOpen }
  );

  const [startReview, { isLoading: isStartingReview }] = useStartFederalReviewMutation();
  const [requestClarification, { isLoading: isRequestingClarification }] =
    useRequestFederalClarificationMutation();
  const [provideAssistance, { isLoading: isProvidingAssistance }] =
    useProvideFederalAssistanceMutation();
  const [returnToRegion, { isLoading: isReturning }] =
    useReturnFederalEscalationToRegionMutation();
  const [closeIntervention, { isLoading: isClosing }] =
    useCloseFederalInterventionMutation();
  const [addMessage, { isLoading: isSendingMsg }] =
    useAddFederalEscalationMessageMutation();

  const [subDialog, setSubDialog] = useState<
    "clarification" | "assistance" | "return" | "close" | null
  >(null);
  const [notesText, setNotesText] = useState("");
  const [actionTakenText, setActionTakenText] = useState("");
  const [chatText, setChatText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen || !escalationId) return null;

  const handleStartReview = async () => {
    try {
      setErrorMsg("");
      await startReview(escalationId).unwrap();
      refetch();
      onRefresh?.();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err.message || "Failed to start review.");
    }
  };

  const handleClarification = async () => {
    if (!notesText.trim()) {
      setErrorMsg("Clarification question is required.");
      return;
    }
    try {
      setErrorMsg("");
      await requestClarification({
        escalationId,
        clarification_text: notesText.trim(),
      }).unwrap();
      setSubDialog(null);
      setNotesText("");
      refetch();
      onRefresh?.();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err.message || "Failed to request clarification.");
    }
  };

  const handleAssistance = async () => {
    if (!notesText.trim()) {
      setErrorMsg("Response summary is required.");
      return;
    }
    try {
      setErrorMsg("");
      await provideAssistance({
        escalationId,
        federal_response_summary: notesText.trim(),
        federal_action_taken: actionTakenText.trim(),
      }).unwrap();
      setSubDialog(null);
      setNotesText("");
      setActionTakenText("");
      refetch();
      onRefresh?.();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err.message || "Failed to record assistance.");
    }
  };

  const handleReturn = async () => {
    if (!notesText.trim()) {
      setErrorMsg("Return explanation is required.");
      return;
    }
    try {
      setErrorMsg("");
      await returnToRegion({
        escalationId,
        returned_reason: notesText.trim(),
      }).unwrap();
      setSubDialog(null);
      setNotesText("");
      refetch();
      onRefresh?.();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err.message || "Failed to return escalation.");
    }
  };

  const handleCloseIntervention = async () => {
    try {
      setErrorMsg("");
      await closeIntervention(escalationId).unwrap();
      setSubDialog(null);
      refetch();
      onRefresh?.();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err.message || "Failed to close intervention.");
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    try {
      setErrorMsg("");
      await addMessage({
        escalationId,
        message_text: chatText.trim(),
        is_internal_federal_note: isInternalNote,
      }).unwrap();
      setChatText("");
      refetch();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err.message || "Failed to send message.");
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="font-mono text-lg font-bold">
                    {escalation?.escalation_number}
                  </DialogTitle>
                  <RegionalEscalationStatusBadge
                    status={escalation?.escalation_status as any}
                  />
                  {escalation?.region && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                      📍 {escalation.region.name}
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-xs mt-1">
                  Originating Regional Issue:{" "}
                  <span className="font-mono font-semibold">
                    {escalation?.regionalIssue?.issue_number}
                  </span>{" "}
                  • Escalated on{" "}
                  {escalation?.escalated_at
                    ? format(new Date(escalation.escalated_at), "PPP p")
                    : ""}
                </DialogDescription>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {escalation?.escalation_status === "escalated" && (
                  <Button
                    size="sm"
                    onClick={handleStartReview}
                    disabled={isStartingReview}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  >
                    <PlayCircle className="h-3.5 w-3.5 mr-1" />
                    Start Review
                  </Button>
                )}

                {["escalated", "under_federal_review"].includes(
                  escalation?.escalation_status || ""
                ) && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setErrorMsg("");
                        setNotesText("");
                        setSubDialog("clarification");
                      }}
                      className="text-xs"
                    >
                      <HelpCircle className="h-3.5 w-3.5 mr-1 text-orange-600" />
                      Request Clarification
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => {
                        setErrorMsg("");
                        setNotesText("");
                        setActionTakenText("");
                        setSubDialog("assistance");
                      }}
                      className="bg-teal-600 hover:bg-teal-700 text-white text-xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Provide Guidance
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setErrorMsg("");
                        setNotesText("");
                        setSubDialog("return");
                      }}
                      className="text-xs"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Return to Region
                    </Button>
                  </>
                )}

                {escalation?.escalation_status === "assistance_provided" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSubDialog("close")}
                    className="text-xs border-zinc-400"
                  >
                    <Archive className="h-3.5 w-3.5 mr-1" />
                    Conclude Intervention
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded text-xs flex items-center gap-2 my-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading escalation details...
            </div>
          ) : (
            <div className="space-y-4 py-2 text-sm">
              {/* Escalation Briefing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 rounded-lg space-y-1">
                  <span className="font-semibold text-purple-900 dark:text-purple-200 text-xs uppercase tracking-wider">
                    Escalation Reason
                  </span>
                  <p className="text-foreground text-xs leading-relaxed">
                    {escalation?.escalation_reason}
                  </p>
                </div>

                <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 rounded-lg space-y-1">
                  <span className="font-semibold text-purple-900 dark:text-purple-200 text-xs uppercase tracking-wider">
                    Requested Assistance ({escalation?.assistance_type})
                  </span>
                  <p className="text-foreground text-xs leading-relaxed">
                    {escalation?.requested_assistance}
                  </p>
                </div>
              </div>

              {/* Official Guidance if provided */}
              {escalation?.federal_response_summary && (
                <div className="p-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-300 rounded-lg space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-teal-800">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Official Federal Guidance</span>
                  </div>
                  <p className="text-teal-950 dark:text-teal-200 leading-relaxed whitespace-pre-wrap">
                    {escalation.federal_response_summary}
                  </p>
                  {escalation.federal_action_taken && (
                    <div className="pt-1 mt-1 border-t border-teal-200 font-medium">
                      Action Taken: {escalation.federal_action_taken}
                    </div>
                  )}
                </div>
              )}

              {/* Underlying Regional Issue Information */}
              <div className="p-3 bg-card border rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="font-semibold text-foreground">
                    Original Regional Issue: {escalation?.regionalIssue?.title}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Regional Status:</span>
                    <RegionalIssueStatusBadge
                      status={(escalation?.regionalIssue?.status as any) || "submitted"}
                    />
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {escalation?.regionalIssue?.description}
                </p>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1">
                  <span>Category: {escalation?.regionalIssue?.category?.name || "—"}</span>
                  <span>Priority: {escalation?.regionalIssue?.priority?.label || "—"}</span>
                  <span>
                    Regional Raiser:{" "}
                    {escalation?.regionalIssue?.raiser?.full_name || "Unknown"}
                  </span>
                </div>
              </div>

              {/* Shared Attachments (Explicitly shared by Region) */}
              {escalation?.shared_attachments && escalation.shared_attachments.length > 0 && (
                <div className="p-3 bg-card border rounded-lg space-y-2 text-xs">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4 text-purple-600" />
                    <span>Shared Supporting Documents ({escalation.shared_attachments.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {escalation.shared_attachments.map((att) => (
                      <a
                        key={att.attachment_id}
                        href={`/api/federal-regional-escalations/${escalation.escalation_id}/attachments/${att.attachment_id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2 rounded border bg-muted/40 hover:bg-muted transition text-xs font-medium text-foreground hover:text-blue-600"
                      >
                        <span className="truncate max-w-[200px]">{att.file_name}</span>
                        <Download className="h-3.5 w-3.5 ml-2 text-muted-foreground shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Communication Thread */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4" />
                    Communication & Guidance Thread ({escalation?.messages?.length || 0})
                  </h4>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {escalation?.messages && escalation.messages.length > 0 ? (
                    escalation.messages.map((m) => (
                      <div
                        key={m.message_id}
                        className={`p-2.5 rounded-lg border text-xs ${
                          m.is_internal_federal_note
                            ? "bg-amber-50/80 border-amber-300 dark:bg-amber-950/40"
                            : m.sender_scope === "federal"
                            ? "bg-blue-50/70 border-blue-200 dark:bg-blue-950/30 ml-4"
                            : "bg-purple-50/70 border-purple-200 dark:bg-purple-950/30 mr-4"
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold mb-1">
                          <span
                            className={
                              m.is_internal_federal_note
                                ? "text-amber-900 flex items-center gap-1"
                                : m.sender_scope === "federal"
                                ? "text-blue-800"
                                : "text-purple-800"
                            }
                          >
                            {m.is_internal_federal_note && (
                              <Lock className="h-3 w-3 inline text-amber-700" />
                            )}
                            {m.is_internal_federal_note
                              ? "INTERNAL FEDERAL NOTE (Shielded from Region)"
                              : m.sender_scope === "federal"
                              ? "🏛️ Federal Ministry Desk"
                              : "📍 Regional Bureau"}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {m.created_at
                              ? format(new Date(m.created_at), "MMM d, h:mm a")
                              : ""}
                          </span>
                        </div>
                        <p className="text-foreground whitespace-pre-wrap">{m.message_text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic py-1">
                      No communication records yet.
                    </p>
                  )}
                </div>

                {/* Reply / Note Input */}
                {escalation?.escalation_status !== "closed" && (
                  <form onSubmit={handleSendChat} className="space-y-2 pt-1 border-t">
                    <Textarea
                      placeholder="Type guidance message for region, or internal federal note..."
                      value={chatText}
                      onChange={(e) => setChatText(e.target.value)}
                      rows={2}
                      className="text-xs"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isInternalNote}
                          onChange={(e) => setIsInternalNote(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <span>Private Federal Note (shielded from region)</span>
                      </label>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isSendingMsg || !chatText.trim()}
                        className="bg-blue-700 hover:bg-blue-800 text-white text-xs"
                      >
                        <Send className="h-3.5 w-3.5 mr-1" />
                        Send Message
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={onClose}>
              Close Window
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subdialogs */}
      <Dialog open={subDialog !== null} onOpenChange={() => setSubDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {subDialog === "clarification" && "Request Clarification from Region"}
              {subDialog === "assistance" && "Provide Official Federal Guidance"}
              {subDialog === "return" && "Return Escalation to Region"}
              {subDialog === "close" && "Conclude Federal Intervention"}
            </DialogTitle>
            <DialogDescription>
              {subDialog === "clarification" &&
                "Specify what additional data or explanation the region must provide."}
              {subDialog === "assistance" &&
                "Record the official national decision, guidance, or assistance provided."}
              {subDialog === "return" &&
                "State why this escalation cannot be handled at the Federal level."}
              {subDialog === "close" &&
                "Confirm closure of Federal intervention. The underlying Regional issue will remain in its independent Regional lifecycle."}
            </DialogDescription>
          </DialogHeader>

          {subDialog !== "close" && (
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  {subDialog === "clarification"
                    ? "Clarification Questions *"
                    : subDialog === "assistance"
                    ? "Official Guidance / Response Summary *"
                    : "Return Explanation *"}
                </Label>
                <Textarea
                  placeholder="Enter details..."
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              {subDialog === "assistance" && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Federal Action Taken (Optional)</Label>
                  <Textarea
                    placeholder="e.g. Dispatched expert team, issued ministerial circular, updated national map..."
                    value={actionTakenText}
                    onChange={(e) => setActionTakenText(e.target.value)}
                    rows={2}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubDialog(null)}>
              Cancel
            </Button>
            {subDialog === "clarification" && (
              <Button
                onClick={handleClarification}
                disabled={isRequestingClarification}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Send Request
              </Button>
            )}
            {subDialog === "assistance" && (
              <Button
                onClick={handleAssistance}
                disabled={isProvidingAssistance}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                Submit Guidance
              </Button>
            )}
            {subDialog === "return" && (
              <Button onClick={handleReturn} disabled={isReturning} variant="destructive">
                Confirm Return
              </Button>
            )}
            {subDialog === "close" && (
              <Button onClick={handleCloseIntervention} disabled={isClosing}>
                Confirm Conclude
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

