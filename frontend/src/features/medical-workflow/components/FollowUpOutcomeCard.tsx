"use client";

import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ThumbsDown,
  ThumbsUp,
  UserMinus,
  UserX,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { FollowUpOutcome, FollowUpOutcomeStatus } from "@/redux/api/followUpApi";

type Props = {
  outcome: FollowUpOutcome;
  onRecordOutcome?: () => void;
  onCreateNextFollowUp?: () => void;
  readOnly?: boolean;
};

const OUTCOME_CONFIG: Record<FollowUpOutcomeStatus, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: typeof CheckCircle2;
  description: string;
}> = {
  RESOLVED: { label: "Resolved", variant: "default", icon: CheckCircle2, description: "Condition fully addressed" },
  IMPROVED: { label: "Improved", variant: "default", icon: ThumbsUp, description: "Condition improved with treatment" },
  STABLE: { label: "Stable", variant: "secondary", icon: Activity, description: "Condition stable, unchanged" },
  WORSENED: { label: "Worsened", variant: "destructive", icon: ThumbsDown, description: "Condition deteriorated" },
  REFERRED: { label: "Referred", variant: "outline", icon: ArrowRight, description: "Patient referred elsewhere" },
  LOST_TO_FOLLOW_UP: { label: "Lost to Follow-up", variant: "outline", icon: UserX, description: "Unable to contact patient" },
  PATIENT_DECLINED: { label: "Patient Declined", variant: "outline", icon: UserMinus, description: "Patient declined further care" },
  OTHER: { label: "Other", variant: "secondary", icon: AlertTriangle, description: "Other outcome" },
};

export function FollowUpOutcomeCard({ outcome, onRecordOutcome, onCreateNextFollowUp, readOnly }: Props) {
  const config = OUTCOME_CONFIG[outcome.outcome_status] || OUTCOME_CONFIG.OTHER;
  const Icon = config.icon;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      });
    } catch { return dateStr; }
  };

  return (
    <Card className="border-l-4 border-l-emerald-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
              <Icon className="h-4 w-4 text-emerald-600" />
            </div>
            <CardTitle className="text-base font-semibold text-emerald-800">
              Clinical Outcome
            </CardTitle>
          </div>
          <Badge variant={config.variant} className="flex items-center gap-1">
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {outcome.treatment_response && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Treatment Response</p>
            <p className="text-sm">{outcome.treatment_response}</p>
          </div>
        )}
        {outcome.resolution_notes && (
          <div className="rounded-md bg-muted/30 p-2.5">
            <p className="text-xs font-medium text-muted-foreground">Resolution Notes</p>
            <p className="text-sm whitespace-pre-wrap">{outcome.resolution_notes}</p>
          </div>
        )}
        {outcome.recorder && (
          <div className="text-xs text-muted-foreground">
            Assessed by <span className="font-medium">{outcome.recorder.full_name}</span>
            {" on "}
            <span className="font-medium">{formatDate(outcome.recorded_at)}</span>
          </div>
        )}
        {outcome.requires_additional_follow_up && (
          <div className="rounded-md bg-amber-50 p-2.5 text-sm text-amber-800 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Additional follow-up required</span>
          </div>
        )}
        <Separator />
        <div className="flex flex-wrap gap-2">
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={onRecordOutcome}>
              Update Outcome
            </Button>
          )}
          {outcome.requires_additional_follow_up && onCreateNextFollowUp && (
            <Button variant="default" size="sm" onClick={onCreateNextFollowUp}>
              <ArrowRight className="mr-1.5 h-4 w-4" />
              Create Follow-up
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}