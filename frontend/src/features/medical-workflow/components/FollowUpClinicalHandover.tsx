"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Pill,
  Stethoscope,
  User,
  UserCheck,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { FollowUpContext } from "@/redux/api/medicalWorkflowApi";

type Props = {
  context: FollowUpContext;
  onDismiss?: () => void;
  onViewFollowUpHistory?: () => void;
};

const PRIORITY_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  URGENT: "destructive",
  HIGH: "default",
  NORMAL: "secondary",
  LOW: "outline",
};

const PRIORITY_ICONS: Record<string, typeof AlertTriangle> = {
  URGENT: AlertTriangle,
  HIGH: AlertTriangle,
  NORMAL: ClipboardList,
  LOW: ClipboardList,
};

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  COMPLETED: "default",
  SCHEDULED: "secondary",
  RECOMMENDED: "outline",
  PENDING_SCHEDULING: "outline",
  MISSED: "destructive",
  CANCELLED: "outline",
  EXPIRED: "outline",
};

export function FollowUpClinicalHandover({
  context,
  onDismiss,
  onViewFollowUpHistory,
}: Props) {
  const router = useRouter();
  const [previousDataOpen, setPreviousDataOpen] = useState(true);

  const PriorityIcon = context.priority
    ? PRIORITY_ICONS[context.priority] || ClipboardList
    : ClipboardList;

  const handleOpenPreviousEncounter = () => {
    if (context.origin_encounter_id) {
      router.push(`/appointments/${context.origin_encounter_id}`);
    }
  };

  const handleOpenFollowUpHistory = () => {
    if (onViewFollowUpHistory) {
      onViewFollowUpHistory();
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const diagnosisSummary = useMemo(() => {
    if (!context.previous_diagnosis || context.previous_diagnosis.length === 0) {
      return null;
    }
    return context.previous_diagnosis;
  }, [context.previous_diagnosis]);

  const prescriptionsSummary = useMemo(() => {
    if (
      !context.previous_prescriptions ||
      context.previous_prescriptions.length === 0
    ) {
      return null;
    }
    return context.previous_prescriptions;
  }, [context.previous_prescriptions]);

  const clinicalNotesSummary = useMemo(() => {
    if (!context.previous_notes || context.previous_notes.length === 0) {
      return null;
    }
    return context.previous_notes.slice(0, 5); // Show max 5 notes
  }, [context.previous_notes]);

  return (
    <Card className="border-l-4 border-l-blue-500 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <Stethoscope className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-blue-800">
                FOLLOW-UP VISIT
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Clinical handover from previous encounter
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {context.priority && (
              <Badge
                variant={PRIORITY_VARIANTS[context.priority] || "secondary"}
                className="flex items-center gap-1"
              >
                <PriorityIcon className="h-3 w-3" />
                {context.priority}
              </Badge>
            )}
            {context.follow_up_status && (
              <Badge
                variant={STATUS_VARIANTS[context.follow_up_status] || "outline"}
                className="text-xs"
              >
                {context.follow_up_status.replace(/_/g, " ")}
              </Badge>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onDismiss}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Provider Information */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2 rounded-md bg-muted/30 p-2.5">
            <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                Previous Provider
              </p>
              <p className="truncate text-sm font-medium">
                {context.previous_provider?.full_name || "Unknown"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-md bg-muted/30 p-2.5">
            <UserCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                Recommended By
              </p>
              <p className="truncate text-sm font-medium">
                {context.recommended_by?.full_name || "Unknown"}
              </p>
            </div>
          </div>
        </div>

        {/* Date and Attempt Information */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              Recommended: {formatDate(context.recommendation_date)}
            </span>
          </div>
          {context.expected_review_date && (
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>Review by: {formatDate(context.expected_review_date)}</span>
            </div>
          )}
          {context.attempt_number !== undefined && (
            <Badge variant="outline" className="text-xs font-normal">
              Attempt #{context.attempt_number}
            </Badge>
          )}
        </div>

        <Separator />

        {/* Reason */}
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Reason for Follow-up
          </p>
          <p className="text-sm">{context.reason || "Not specified"}</p>
        </div>

        {/* Clinical Instructions */}
        {context.clinical_instructions && (
          <div className="rounded-md bg-amber-50 p-3">
            <p className="mb-1 text-xs font-medium text-amber-700">
              Clinical Instructions
            </p>
            <p className="text-sm text-amber-800">
              {context.clinical_instructions}
            </p>
          </div>
        )}

        {/* Previous Encounter Data (Collapsible) */}
        {(diagnosisSummary ||
          prescriptionsSummary ||
          clinicalNotesSummary) && (
          <Collapsible
            open={previousDataOpen}
            onOpenChange={setPreviousDataOpen}
          >
            <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm font-medium hover:bg-muted/70">
              <Eye className="h-4 w-4" />
              <span>Previous Encounter Data</span>
              {previousDataOpen ? (
                <ChevronUp className="ml-auto h-4 w-4" />
              ) : (
                <ChevronDown className="ml-auto h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              {/* Previous Diagnosis */}
              {diagnosisSummary && diagnosisSummary.length > 0 && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    Previous Diagnosis ({diagnosisSummary.length})
                  </p>
                  <div className="space-y-1.5">
                    {diagnosisSummary.map((dx) => (
                      <div
                        key={dx.log_id}
                        className="rounded-md border p-2 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {dx.header_title}
                          </span>
                          {dx.provider_name && (
                            <span className="text-xs text-muted-foreground">
                              {dx.provider_name}
                            </span>
                          )}
                        </div>
                        {dx.form_summary && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {dx.form_summary}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(dx.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Previous Prescriptions */}
              {prescriptionsSummary && prescriptionsSummary.length > 0 && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Pill className="h-3.5 w-3.5" />
                    Previous Prescriptions ({prescriptionsSummary.length})
                  </p>
                  <div className="space-y-1.5">
                    {prescriptionsSummary.map((rx) => (
                      <div
                        key={rx.prescription_id}
                        className="rounded-md border p-2 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {rx.template_name || "Prescription"}
                          </span>
                          {rx.prescriber_name && (
                            <span className="text-xs text-muted-foreground">
                              {rx.prescriber_name}
                            </span>
                          )}
                        </div>
                        {rx.items_summary && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {rx.items_summary}
                          </p>
                        )}
                        {rx.category_name && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Category: {rx.category_name}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Previous Clinical Notes */}
              {clinicalNotesSummary && clinicalNotesSummary.length > 0 && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    Previous Clinical Notes ({clinicalNotesSummary.length})
                  </p>
                  <div className="space-y-1.5">
                    {clinicalNotesSummary.map((note) => (
                      <div
                        key={note.log_id}
                        className="rounded-md border p-2 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {note.header_title}
                          </span>
                          {note.provider_name && (
                            <span className="text-xs text-muted-foreground">
                              {note.provider_name}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">
                          {note.notes.length > 200
                            ? `${note.notes.slice(0, 200)}...`
                            : note.notes}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline Summary */}
              {context.previous_timeline_summary && (
                <div className="flex flex-wrap gap-3 rounded-md bg-muted/30 p-2.5">
                  <div className="text-center">
                    <p className="text-lg font-semibold">
                      {context.previous_timeline_summary.total_logs}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total Entries
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold">
                      {context.previous_timeline_summary.action_types?.length ||
                        0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Action Types
                    </p>
                  </div>
                  {context.previous_timeline_summary.last_action && (
                    <div className="text-center">
                      <p className="text-sm font-semibold">
                        {context.previous_timeline_summary.last_action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last Action
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {context.origin_encounter_id && (
            <Button
              variant="default"
              size="sm"
              onClick={handleOpenPreviousEncounter}
            >
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Open Previous Encounter
            </Button>
          )}
          {context.follow_up_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenFollowUpHistory}
            >
              <FileText className="mr-1.5 h-4 w-4" />
              View Follow-up History
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}