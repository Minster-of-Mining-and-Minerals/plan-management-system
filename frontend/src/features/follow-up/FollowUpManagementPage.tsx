"use client";

import { useState, useCallback } from "react";
import { Calendar, Clock, Plus, Search, Filter, RefreshCw, User2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { useGetFollowUpCountsQuery, useListFollowUpsByStatusQuery, useGetFollowUpQuery } from "@/redux/api/followUpApi";
import type { FollowUpRecord, FollowUpStatus, FollowUpPriority } from "@/redux/api/followUpApi";
import { ScheduleFollowUpDialog } from "./components/ScheduleFollowUpDialog";
import { FollowUpHistoryPanel } from "./components/FollowUpHistoryPanel";
import { usePermissions } from "@/hooks/usePermissions";

const PRIORITY_ORDER: Record<FollowUpPriority, number> = {
  URGENT: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

const STATUS_LABELS: Record<string, string> = {
  RECOMMENDED: "Pending Scheduling",
  PENDING_SCHEDULING: "Pending Scheduling",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  MISSED: "Missed",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  RECOMMENDED: "secondary",
  PENDING_SCHEDULING: "secondary",
  SCHEDULED: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
  EXPIRED: "outline",
  MISSED: "destructive",
};

const PRIORITY_VARIANTS: Record<FollowUpPriority, "default" | "secondary" | "destructive" | "outline"> = {
  URGENT: "destructive",
  HIGH: "default",
  NORMAL: "secondary",
  LOW: "outline",
};

interface QueueTab {
  value: string;
  label: string;
  statuses?: string[];
}

const QUEUE_TABS: QueueTab[] = [
  { value: "pending", label: "Pending Scheduling", statuses: ["RECOMMENDED", "PENDING_SCHEDULING"] },
  { value: "scheduled", label: "Scheduled", statuses: ["SCHEDULED"] },
  { value: "missed", label: "Missed", statuses: ["MISSED"] },
  { value: "cancelled", label: "Cancelled", statuses: ["CANCELLED"] },
  { value: "completed", label: "Completed", statuses: ["COMPLETED"] },
];

export function FollowUpManagementPage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedFollowUpId, setSelectedFollowUpId] = useState<string | null>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [selectedQueueStatus, setSelectedQueueStatus] = useState<string | undefined>(undefined);

  const activeTabConfig = QUEUE_TABS.find((t) => t.value === activeTab);
  const statusesParam = activeTabConfig?.statuses?.join(",");

  const { data: counts, isLoading: countsLoading } = useGetFollowUpCountsQuery();
  const { data: queueData, isLoading: queueLoading } = useListFollowUpsByStatusQuery(
    { statuses: statusesParam, limit: 100 },
    { skip: !statusesParam }
  );
  const { data: selectedFollowUp } = useGetFollowUpQuery(selectedFollowUpId ?? "", {
    skip: !selectedFollowUpId,
  });

  const followUps = queueData?.data ?? [];

  const handleSchedule = useCallback((followUpId: string) => {
    setSelectedFollowUpId(followUpId);
    setScheduleDialogOpen(true);
  }, []);

  const handleViewHistory = useCallback((followUpId: string) => {
    setSelectedFollowUpId(followUpId);
    setHistoryPanelOpen(true);
  }, []);

  const handleReschedule = useCallback((followUpId: string) => {
    setSelectedFollowUpId(followUpId);
    setScheduleDialogOpen(true);
  }, []);

  const getQueueCount = (tabValue: string): number => {
    if (!counts) return 0;
    const tab = QUEUE_TABS.find((t) => t.value === tabValue);
    if (!tab?.statuses) return 0;
    return tab.statuses.reduce((sum, s) => sum + (counts[s as FollowUpStatus] || 0), 0);
  };

  if (countsLoading) return <Loading01 />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Follow-up Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage patient follow-ups, schedule appointments, and track care continuity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              className="pl-8 w-[200px] sm:w-[280px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {QUEUE_TABS.map((tab) => (
          <Card
            key={tab.value}
            className={`cursor-pointer transition-colors hover:bg-muted/50 ${
              activeTab === tab.value ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setActiveTab(tab.value)}
          >
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{getQueueCount(tab.value)}</p>
              <p className="text-xs text-muted-foreground mt-1">{tab.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Queue List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">
            {activeTabConfig?.label ?? "Follow-ups"}
          </CardTitle>
          <Badge variant="outline">{followUps.length} items</Badge>
        </CardHeader>
        <CardContent>
          {queueLoading ? (
            <Loading01 />
          ) : followUps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No {activeTabConfig?.label.toLowerCase()} follow-ups</p>
              <p className="text-xs text-muted-foreground mt-1">
                Follow-ups will appear here when clinicians recommend them
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {followUps.map((fu: FollowUpRecord) => (
                <FollowUpCard
                  key={fu.follow_up_id}
                  followUp={fu}
                  onSchedule={handleSchedule}
                  onViewHistory={handleViewHistory}
                  onReschedule={handleReschedule}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Dialog */}
      {selectedFollowUpId && (
        <ScheduleFollowUpDialog
          followUpId={selectedFollowUpId}
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          onSuccess={() => setSelectedFollowUpId(null)}
        />
      )}

      {/* History Panel */}
      {selectedFollowUpId && (
        <FollowUpHistoryPanel
          followUpId={selectedFollowUpId}
          open={historyPanelOpen}
          onOpenChange={setHistoryPanelOpen}
        />
      )}
    </div>
  );
}

function FollowUpCard({
  followUp,
  onSchedule,
  onViewHistory,
  onReschedule,
}: {
  followUp: FollowUpRecord;
  onSchedule: (id: string) => void;
  onViewHistory: (id: string) => void;
  onReschedule: (id: string) => void;
}) {
  const latestAttempt = followUp.attempts && followUp.attempts.length > 0
    ? followUp.attempts[followUp.attempts.length - 1]
    : null;
  const latestSchedule = latestAttempt?.schedule;

  const canSchedule = ["RECOMMENDED", "PENDING_SCHEDULING"].includes(followUp.status);
  const isMissed = followUp.status === "MISSED";
  const isScheduled = followUp.status === "SCHEDULED";
  const isCompleted = followUp.status === "COMPLETED";
  const isCancelled = followUp.status === "CANCELLED";

  return (
    <div className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/30">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <User2 className="h-5 w-5 text-primary" />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-sm">
            {followUp.patient?.full_name ?? "Unknown Patient"}
          </p>
          <Badge variant={STATUS_VARIANTS[followUp.status]} className="text-[10px]">
            {STATUS_LABELS[followUp.status] ?? followUp.status}
          </Badge>
          <Badge variant={PRIORITY_VARIANTS[followUp.priority]} className="text-[10px]">
            {followUp.priority}
          </Badge>
          {followUp.recommended_date && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Recommended: {followUp.recommended_date}
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2">
          {followUp.reason}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
          {followUp.recommender && (
            <span>By: {followUp.recommender.full_name}</span>
          )}
          {followUp.assignedDepartment && (
            <span>Dept: {followUp.assignedDepartment.name}</span>
          )}
          {followUp.target_date && (
            <span>Target: {followUp.target_date}</span>
          )}
          {latestAttempt && (
            <span>
              Attempt #{latestAttempt.attempt_number} -{" "}
              {latestAttempt.status}
            </span>
          )}
          {latestSchedule && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {latestSchedule.schedule_date} {latestSchedule.start_time}
            </span>
          )}
          {latestSchedule?.staff && (
            <span>Dr: {latestSchedule.staff.full_name}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {(canSchedule || isMissed) && (
          <Button
            size="sm"
            variant={isMissed ? "destructive" : "default"}
            onClick={() => (isMissed ? onReschedule(followUp.follow_up_id) : onSchedule(followUp.follow_up_id))}
          >
            {isMissed ? (
              <>
                <RefreshCw className="mr-1 h-3 w-3" />
                Reschedule
              </>
            ) : (
              <>
                <Plus className="mr-1 h-3 w-3" />
                Schedule
              </>
            )}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onViewHistory(followUp.follow_up_id)}
        >
          History
        </Button>
      </div>
    </div>
  );
}