"use client";

import { useMemo } from "react";
import {
  ArrowDown,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  User,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "@/i18n/navigation";
import type { FollowUpChainItem, FollowUpOutcomeStatus } from "@/redux/api/followUpApi";

type Props = {
  chain: FollowUpChainItem[];
  currentFollowUpId?: string;
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  COMPLETED: "default",
  SCHEDULED: "secondary",
  RECOMMENDED: "outline",
  PENDING_SCHEDULING: "outline",
  MISSED: "destructive",
  CANCELLED: "outline",
  EXPIRED: "outline",
};

const OUTCOME_BADGES: Record<FollowUpOutcomeStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  RESOLVED: { label: "Resolved", variant: "default" },
  IMPROVED: { label: "Improved", variant: "default" },
  STABLE: { label: "Stable", variant: "secondary" },
  WORSENED: { label: "Worsened", variant: "destructive" },
  REFERRED: { label: "Referred", variant: "outline" },
  LOST_TO_FOLLOW_UP: { label: "Lost", variant: "outline" },
  PATIENT_DECLINED: { label: "Declined", variant: "outline" },
  OTHER: { label: "Other", variant: "secondary" },
};

export function FollowUpChainTimeline({ chain, currentFollowUpId }: Props) {
  const router = useRouter();

  if (!chain || chain.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Follow-up Chain ({chain.length} encounters)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-0">
          {chain.map((item, index) => {
            const isCurrent = item.follow_up_id === currentFollowUpId;
            const outcomeBadge = item.outcome
              ? OUTCOME_BADGES[item.outcome.outcome_status] || OUTCOME_BADGES.OTHER
              : null;

            const formatDate = (d?: string | null) => {
              if (!d) return "N/A";
              try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
              catch { return d; }
            };

            return (
              <div key={item.follow_up_id} className="relative">
                {index > 0 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div
                  className={`rounded-lg border p-3 ${
                    isCurrent ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium">
                        {formatDate(item.recommended_date)}
                      </span>
                      <Badge variant={STATUS_VARIANTS[item.status] || "outline"} className="text-[10px]">
                        {item.status}
                      </Badge>
                    </div>
                    {outcomeBadge && (
                      <Badge variant={outcomeBadge.variant} className="text-[10px]">
                        {outcomeBadge.label}
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.reason}
                  </p>

                  {item.completed_encounter_id && (
                    <div className="mt-1.5">
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => router.push(`/appointments/${item.completed_encounter_id}`)}
                      >
                        <User className="mr-1 h-3 w-3" />
                        View Encounter
                      </Button>
                    </div>
                  )}

                  {isCurrent && (
                    <div className="mt-1.5">
                      <Badge variant="default" className="text-[10px] bg-blue-500">
                        Current Encounter
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}