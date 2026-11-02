"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useGetRegionalIssueEscalationsQuery,
  useRecallRegionalIssueEscalationMutation,
  useAddRegionalIssueEscalationMessageMutation,
} from "@/redux/api/regionalIssueApi";
import { RegionalEscalationStatusBadge } from "./RegionalIssueStatusBadge";
import {
  ArrowUpRight,
  RotateCcw,
  Send,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Building,
  Calendar,
  ShieldAlert,
} from "lucide-react";
import { format } from "date-fns";

interface RegionalEscalationTrackingCardProps {
  regionId: string;
  issueId: string;
  onRefresh?: () => void;
}

export function RegionalEscalationTrackingCard({
  regionId,
  issueId,
  onRefresh,
}: RegionalEscalationTrackingCardProps) {
  const { data: escalations = [], refetch } = useGetRegionalIssueEscalationsQuery(
    { regionId, issueId },
    { skip: !regionId || !issueId }
  );

  const [recallEscalation, { isLoading: isRecalling }] = useRecallRegionalIssueEscalationMutation();
  const [addMessage, { isLoading: isSendingMsg }] = useAddRegionalIssueEscalationMessageMutation();

  const [isRecallOpen, setIsRecallOpen] = useState(false);
  const [recallReason, setRecallReason] = useState("");
  const [messageText, setMessageText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const activeEscalation = escalations[0];
  if (!activeEscalation) return null;

  const isEligibleForRecall = activeEscalation.escalation_status === "escalated";

  const handleRecall = async () => {
    try {
      setErrorMsg("");
      await recallEscalation({
        regionId,
        issueId,
        escalationId: activeEscalation.escalation_id,
        recall_reason: recallReason,
      }).unwrap();
      setIsRecallOpen(false);
      setRecallReason("");
      refetch();
      onRefresh?.();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err.message || "Failed to recall escalation.");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    try {
      setErrorMsg("");
      await addMessage({
        regionId,
        issueId,
        escalationId: activeEscalation.escalation_id,
        message_text: messageText.trim(),
      }).unwrap();
      setMessageText("");
      refetch();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err.message || "Failed to send message.");
    }
  };

  return (
    <>
      <Card className="border-purple-200 dark:border-purple-900 bg-purple-50/20 dark:bg-purple-950/10">
        <CardHeader className="pb-3 border-b border-purple-100 dark:border-purple-900/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-purple-700" />
              <div>
                <CardTitle className="text-base font-bold text-purple-950 dark:text-purple-100">
                  Federal Escalation Gateway
                </CardTitle>
                <CardDescription className="text-xs">
                  Reference: <span className="font-mono font-semibold">{activeEscalation.escalation_number}</span>
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <RegionalEscalationStatusBadge status={activeEscalation.escalation_status} />
              {isEligibleForRecall && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsRecallOpen(true)}
                  className="border-purple-300 text-purple-700 hover:bg-purple-100 text-xs h-7"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Recall Escalation
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-card rounded border space-y-1">
              <span className="font-semibold text-muted-foreground uppercase text-[10px]">
                Escalation Reason
              </span>
              <p className="text-foreground leading-relaxed">{activeEscalation.escalation_reason}</p>
            </div>

            <div className="p-3 bg-card rounded border space-y-1">
              <span className="font-semibold text-muted-foreground uppercase text-[10px]">
                Requested Federal Assistance ({activeEscalation.assistance_type})
              </span>
              <p className="text-foreground leading-relaxed">{activeEscalation.requested_assistance}</p>
            </div>
          </div>

          {activeEscalation.federal_response_summary && (
            <div className="p-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 rounded text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-teal-800">
                <CheckCircle2 className="h-4 w-4" />
                <span>Official Federal Response</span>
              </div>
              <p className="text-teal-950 dark:text-teal-200 leading-relaxed">
                {activeEscalation.federal_response_summary}
              </p>
            </div>
          )}

          {/* Communication Thread */}
          <div className="space-y-3 pt-2 border-t border-purple-100 dark:border-purple-900/50">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Regional & Federal Communication ({activeEscalation.messages?.length || 0})
            </h4>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {activeEscalation.messages && activeEscalation.messages.length > 0 ? (
                activeEscalation.messages.map((msg: any) => (
                  <div
                    key={msg.message_id}
                    className={`p-2.5 rounded-lg border text-xs ${
                      msg.sender_scope === "federal"
                        ? "bg-blue-50/70 border-blue-200 dark:bg-blue-950/30 ml-4"
                        : "bg-purple-50/70 border-purple-200 dark:bg-purple-950/30 mr-4"
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold mb-1">
                      <span className={msg.sender_scope === "federal" ? "text-blue-800" : "text-purple-800"}>
                        {msg.sender_scope === "federal" ? "🏛️ Federal Ministry Desk" : "📍 Regional Bureau"}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        {msg.created_at ? format(new Date(msg.created_at), "MMM d, h:mm a") : ""}
                      </span>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{msg.message_text}</p>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-muted-foreground italic py-1">
                  No communication messages recorded yet.
                </p>
              )}
            </div>

            {/* Reply Input */}
            {activeEscalation.escalation_status !== "closed" &&
              activeEscalation.escalation_status !== "recalled" && (
                <form onSubmit={handleSendMessage} className="flex gap-2 pt-1">
                  <Textarea
                    placeholder="Reply to Federal Ministry or provide requested clarification..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    rows={2}
                    className="text-xs resize-none"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSendingMsg || !messageText.trim()}
                    className="bg-purple-700 hover:bg-purple-800 text-white shrink-0 self-end"
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Send
                  </Button>
                </form>
              )}
          </div>
        </CardContent>
      </Card>

      {/* Recall Confirmation Dialog */}
      <Dialog open={isRecallOpen} onOpenChange={setIsRecallOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recall Federal Escalation</DialogTitle>
            <DialogDescription>
              Are you sure you want to recall this escalation? This action is only permitted before
              Federal review commences.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-medium">Reason for Recall</Label>
            <Textarea
              placeholder="e.g. Issue resolved locally or escalated in error..."
              value={recallReason}
              onChange={(e) => setRecallReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecallOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecall} disabled={isRecalling} variant="destructive">
              {isRecalling ? "Recalling..." : "Confirm Recall"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

