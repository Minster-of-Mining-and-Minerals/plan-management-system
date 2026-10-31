"use client";

import { useState } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Users,
  HardDrive,
  Ban,
  Globe,
  Clock,
  MapPin,
  RefreshCw,
  Search,
  Filter,
  LogOut,
  RotateCcw,
  Plus,
  AlertTriangle,
  History,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserAvatar } from "@/components/common/UserAvatar";
import { actionFeedback } from "@/components/action-feedback";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useGetAdminSessionMetricsQuery,
  useGetAdminSessionsQuery,
  useTerminateAdminSessionMutation,
  useTerminateUserSessionsAdminMutation,
  useGetDeviceRestrictionsQuery,
  useCreateDeviceRestrictionMutation,
  useDeleteDeviceRestrictionMutation,
  useGetIpRestrictionsQuery,
  useCreateIpRestrictionMutation,
  useDeleteIpRestrictionMutation,
  useGetSessionSecurityLogsQuery,
  UserSessionItem,
  DeviceRestrictionItem,
  IpRestrictionItem,
  SessionSecurityLogItem,
} from "@/redux/api/sessionApi";

interface UserSessionsAdminViewProps {
  domain?: "federal" | "regional" | "company" | "purchasing_center";
  regionId?: string;
  companyId?: string;
  purchasingCenterId?: string;
  title?: string;
  description?: string;
}

function getDeviceIcon(deviceType: string) {
  const dt = (deviceType || "").toLowerCase();
  if (dt.includes("mobile") || dt.includes("phone")) {
    return <Smartphone className="h-4 w-4 text-blue-500" />;
  }
  if (dt.includes("tablet") || dt.includes("ipad")) {
    return <Tablet className="h-4 w-4 text-purple-500" />;
  }
  if (dt.includes("laptop")) {
    return <Laptop className="h-4 w-4 text-emerald-500" />;
  }
  return <Monitor className="h-4 w-4 text-indigo-500" />;
}

export function UserSessionsAdminView({
  domain,
  regionId,
  companyId,
  purchasingCenterId,
  title = "User Sessions & Device Control",
  description = "Manage active sessions, revoke credentials, and enforce device & IP security policies",
}: UserSessionsAdminViewProps) {
  const { can, canAny } = usePermissions();

  const canTerminate = canAny(["USER_SESSION:TERMINATE", "USER_SESSION:MANAGE"]);
  const canTerminateAll = canAny(["USER_SESSION:TERMINATE_ALL", "USER_SESSION:MANAGE"]);
  const canRestrictDevice = canAny(["USER_SESSION:RESTRICT_DEVICE", "USER_SESSION:MANAGE"]);
  const canUnrestrictDevice = canAny(["USER_SESSION:UNRESTRICT_DEVICE", "USER_SESSION:MANAGE"]);
  const canRestrictIp = canAny(["USER_SESSION:RESTRICT_IP", "USER_SESSION:MANAGE"]);
  const canUnrestrictIp = canAny(["USER_SESSION:UNRESTRICT_IP", "USER_SESSION:MANAGE"]);
  const canViewAudit = canAny(["USER_SESSION:VIEW_AUDIT", "USER_SESSION:VIEW", "USER_SESSION:MANAGE"]);

  // Search & Filter States
  const [activeTab, setActiveTab] = useState("sessions");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Query Params
  const queryParams = {
    page,
    limit,
    search: search.trim() || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    device_type: deviceTypeFilter !== "all" ? deviceTypeFilter : undefined,
    domain,
    region_id: regionId,
    company_id: companyId,
    purchasing_center_id: purchasingCenterId,
  };

  const {
    data: metrics,
    isLoading: isLoadingMetrics,
    refetch: refetchMetrics,
  } = useGetAdminSessionMetricsQuery();

  const {
    data: sessionsData,
    isLoading: isLoadingSessions,
    isFetching: isFetchingSessions,
    refetch: refetchSessions,
  } = useGetAdminSessionsQuery(queryParams);

  const {
    data: deviceRestrictionsData,
    isLoading: isLoadingDevices,
    refetch: refetchDeviceRestrictions,
  } = useGetDeviceRestrictionsQuery({ page: 1, limit: 50 }, { skip: activeTab !== "devices" });

  const {
    data: ipRestrictionsData,
    isLoading: isLoadingIps,
    refetch: refetchIpRestrictions,
  } = useGetIpRestrictionsQuery({ page: 1, limit: 50 }, { skip: activeTab !== "ips" });

  const {
    data: auditLogsData,
    isLoading: isLoadingLogs,
    refetch: refetchAuditLogs,
  } = useGetSessionSecurityLogsQuery({ page: 1, limit: 50 }, { skip: activeTab !== "audit" || !canViewAudit });

  // Mutations
  const [terminateSession, { isLoading: isTerminating }] = useTerminateAdminSessionMutation();
  const [terminateUserSessions, { isLoading: isTerminatingUser }] = useTerminateUserSessionsAdminMutation();
  const [createDeviceRestriction, { isLoading: isRestrictingDevice }] = useCreateDeviceRestrictionMutation();
  const [deleteDeviceRestriction, { isLoading: isDeletingDeviceRestriction }] = useDeleteDeviceRestrictionMutation();
  const [createIpRestriction, { isLoading: isRestrictingIp }] = useCreateIpRestrictionMutation();
  const [deleteIpRestriction, { isLoading: isDeletingIpRestriction }] = useDeleteIpRestrictionMutation();

  // Dialog States
  const [terminateTarget, setTerminateTarget] = useState<UserSessionItem | null>(null);
  const [terminateReason, setTerminateReason] = useState("");

  const [terminateUserTarget, setTerminateUserTarget] = useState<{ userId: string; userName: string } | null>(null);
  const [terminateUserReason, setTerminateUserReason] = useState("");

  const [showAddDeviceDialog, setShowAddDeviceDialog] = useState(false);
  const [newDeviceHash, setNewDeviceHash] = useState("");
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newDeviceType, setNewDeviceType] = useState("desktop");
  const [newDeviceReason, setNewDeviceReason] = useState("");
  const [newDeviceDuration, setNewDeviceDuration] = useState("0");

  const [unrestrictDeviceTarget, setUnrestrictDeviceTarget] = useState<DeviceRestrictionItem | null>(null);

  const [showAddIpDialog, setShowAddIpDialog] = useState(false);
  const [newIpAddress, setNewIpAddress] = useState("");
  const [newIpIsCidr, setNewIpIsCidr] = useState(false);
  const [newIpReason, setNewIpReason] = useState("");
  const [newIpDuration, setNewIpDuration] = useState("0");

  const [unrestrictIpTarget, setUnrestrictIpTarget] = useState<IpRestrictionItem | null>(null);

  // Handlers
  const handleConfirmTerminate = async () => {
    if (!terminateTarget) return;
    try {
      await terminateSession({
        sessionId: terminateTarget.session_id,
        reason: terminateReason.trim() || "administrative_termination",
      }).unwrap();
      actionFeedback.success("Session terminated successfully");
      setTerminateTarget(null);
      setTerminateReason("");
      refetchMetrics();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to terminate session");
    }
  };

  const handleConfirmTerminateUser = async () => {
    if (!terminateUserTarget) return;
    try {
      const res = await terminateUserSessions({
        userId: terminateUserTarget.userId,
        reason: terminateUserReason.trim() || "administrative_terminate_all",
      }).unwrap();
      actionFeedback.success(`Successfully terminated ${res.terminated_count} session(s) for the user`);
      setTerminateUserTarget(null);
      setTerminateUserReason("");
      refetchMetrics();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to terminate user sessions");
    }
  };

  const handleCreateDeviceRestriction = async () => {
    if (!newDeviceHash.trim() || !newDeviceReason.trim()) return;
    try {
      await createDeviceRestriction({
        device_fingerprint_hash: newDeviceHash.trim(),
        device_name: newDeviceName.trim() || undefined,
        device_type: newDeviceType,
        reason: newDeviceReason.trim(),
        duration_minutes: parseInt(newDeviceDuration, 10) > 0 ? parseInt(newDeviceDuration, 10) : undefined,
      }).unwrap();
      actionFeedback.success("Device restriction enforced. Associated active sessions have been terminated.");
      setShowAddDeviceDialog(false);
      setNewDeviceHash("");
      setNewDeviceName("");
      setNewDeviceReason("");
      setNewDeviceDuration("0");
      refetchMetrics();
      refetchDeviceRestrictions();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to restrict device");
    }
  };

  const handleConfirmUnrestrictDevice = async () => {
    if (!unrestrictDeviceTarget) return;
    try {
      await deleteDeviceRestriction({ restrictionId: unrestrictDeviceTarget.restriction_id }).unwrap();
      actionFeedback.success("Device restriction removed successfully");
      setUnrestrictDeviceTarget(null);
      refetchMetrics();
      refetchDeviceRestrictions();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to remove device restriction");
    }
  };

  const handleCreateIpRestriction = async () => {
    if (!newIpAddress.trim() || !newIpReason.trim()) return;
    try {
      await createIpRestriction({
        ip_address: newIpAddress.trim(),
        is_cidr: newIpIsCidr || newIpAddress.includes("/"),
        reason: newIpReason.trim(),
        duration_minutes: parseInt(newIpDuration, 10) > 0 ? parseInt(newIpDuration, 10) : undefined,
      }).unwrap();
      actionFeedback.success("IP address blocked successfully. Associated active sessions have been terminated.");
      setShowAddIpDialog(false);
      setNewIpAddress("");
      setNewIpReason("");
      setNewIpDuration("0");
      refetchMetrics();
      refetchIpRestrictions();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to restrict IP address");
    }
  };

  const handleConfirmUnrestrictIp = async () => {
    if (!unrestrictIpTarget) return;
    try {
      await deleteIpRestriction({ restrictionId: unrestrictIpTarget.restriction_id }).unwrap();
      actionFeedback.success("IP address unblocked successfully");
      setUnrestrictIpTarget(null);
      refetchMetrics();
      refetchIpRestrictions();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to unblock IP address");
    }
  };

  const sessions = sessionsData?.data || [];
  const meta = sessionsData?.meta || { total: 0, page: 1, limit: 10, totalPages: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Shield className="h-6 w-6 text-primary" />
            {title}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchMetrics();
              refetchSessions();
              if (activeTab === "devices") refetchDeviceRestrictions();
              if (activeTab === "ips") refetchIpRestrictions();
              if (activeTab === "audit") refetchAuditLogs();
            }}
            disabled={isFetchingSessions}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetchingSessions ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="rounded-xl border shadow-2xs p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Active Sessions
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Monitor className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-foreground mt-2">
            {isLoadingMetrics ? "..." : metrics?.total_active_sessions ?? 0}
          </div>
          <span className="text-[10px] text-muted-foreground">Currently authenticated</span>
        </Card>

        <Card className="rounded-xl border shadow-2xs p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Active Users
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-foreground mt-2">
            {isLoadingMetrics ? "..." : metrics?.active_users ?? 0}
          </div>
          <span className="text-[10px] text-muted-foreground">Unique individuals online</span>
        </Card>

        <Card className="rounded-xl border shadow-2xs p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Active Devices
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-foreground mt-2">
            {isLoadingMetrics ? "..." : metrics?.active_devices ?? 0}
          </div>
          <span className="text-[10px] text-muted-foreground">Unique active hardware</span>
        </Card>

        <Card className="rounded-xl border shadow-2xs p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Restricted Devices
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
              <Ban className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-foreground mt-2">
            {isLoadingMetrics ? "..." : metrics?.restricted_devices ?? 0}
          </div>
          <span className="text-[10px] text-muted-foreground">Blocked device signatures</span>
        </Card>

        <Card className="rounded-xl border shadow-2xs p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Restricted IPs
            </span>
            <div className="p-1.5 rounded-lg bg-destructive/10 text-destructive">
              <Globe className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-foreground mt-2">
            {isLoadingMetrics ? "..." : metrics?.restricted_ips ?? 0}
          </div>
          <span className="text-[10px] text-muted-foreground">Blacklisted IPs / Subnets</span>
        </Card>

        <Card className="rounded-xl border shadow-2xs p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Terminated (24h)
            </span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-foreground mt-2">
            {isLoadingMetrics ? "..." : metrics?.terminated_recently ?? 0}
          </div>
          <span className="text-[10px] text-muted-foreground">Sessions revoked</span>
        </Card>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/40 p-1 rounded-xl">
          <TabsTrigger value="sessions" className="text-xs font-semibold rounded-lg">
            Active Sessions ({meta.total || 0})
          </TabsTrigger>
          <TabsTrigger value="devices" className="text-xs font-semibold rounded-lg">
            Device Restrictions ({metrics?.restricted_devices ?? 0})
          </TabsTrigger>
          <TabsTrigger value="ips" className="text-xs font-semibold rounded-lg">
            IP Restrictions ({metrics?.restricted_ips ?? 0})
          </TabsTrigger>
          {canViewAudit && (
            <TabsTrigger value="audit" className="text-xs font-semibold rounded-lg">
              Security Audit Logs
            </TabsTrigger>
          )}
        </TabsList>

        {/* ======================================================== */}
        {/* TAB 1: SESSIONS TABLE */}
        {/* ======================================================== */}
        <TabsContent value="sessions" className="space-y-4 mt-4">
          {/* Filter Bar */}
          <Card className="rounded-xl border shadow-2xs p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, email, IP address, device, OS, browser..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[130px] h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                    <SelectItem value="restricted">Restricted</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={deviceTypeFilter}
                  onValueChange={(val) => {
                    setDeviceTypeFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[130px] h-9 text-xs">
                    <SelectValue placeholder="Device" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Devices</SelectItem>
                    <SelectItem value="desktop">Desktop</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                    <SelectItem value="tablet">Tablet</SelectItem>
                  </SelectContent>
                </Select>

                {(search || statusFilter !== "all" || deviceTypeFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                      setDeviceTypeFilter("all");
                      setPage(1);
                    }}
                    className="h-9 text-xs text-muted-foreground"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Table */}
          <Card className="rounded-xl border shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">User</TableHead>
                    <TableHead className="text-xs font-semibold">Device & Environment</TableHead>
                    <TableHead className="text-xs font-semibold">IP & Location</TableHead>
                    <TableHead className="text-xs font-semibold">Sign In / Activity</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingSessions ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        <span className="text-xs text-muted-foreground mt-2 block">
                          Loading session records...
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : sessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                        No session records found matching filter criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessions.map((sess) => {
                      const isActive = sess.status === "active";
                      return (
                        <TableRow key={sess.session_id} className="hover:bg-muted/10 transition-colors">
                          {/* User */}
                          <TableCell className="py-3">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                profileImage={sess.user?.profile_image}
                                name={sess.user?.full_name || "User"}
                                className="h-8 w-8"
                              />
                              <div className="space-y-0.5">
                                <span className="font-semibold text-xs text-foreground block">
                                  {sess.user?.full_name || "Unknown User"}
                                </span>
                                <span className="text-[11px] text-muted-foreground block">
                                  {sess.user?.email || "No email"}
                                </span>
                                {sess.user?.organization_name && (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                    {sess.user.organization_name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Device & Environment */}
                          <TableCell className="py-3">
                            <div className="flex items-start gap-2.5">
                              <div className="p-1.5 rounded-lg bg-muted border mt-0.5">
                                {getDeviceIcon(sess.device_type)}
                              </div>
                              <div className="space-y-0.5">
                                <span className="font-medium text-xs text-foreground block">
                                  {sess.device_name}
                                </span>
                                <span className="text-[11px] text-muted-foreground block">
                                  {sess.operating_system} • {sess.browser} {sess.browser_version}
                                </span>
                                <span className="font-mono text-[9px] text-muted-foreground/60 block">
                                  {sess.masked_id}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* IP & Location */}
                          <TableCell className="py-3">
                            <div className="space-y-0.5 text-xs">
                              <span className="font-mono text-[11px] text-foreground flex items-center gap-1">
                                <Globe className="h-3 w-3 text-muted-foreground" />
                                {sess.ip_address}
                              </span>
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                {sess.location || "Addis Ababa, Ethiopia"}
                              </span>
                            </div>
                          </TableCell>

                          {/* Timestamps */}
                          <TableCell className="py-3">
                            <div className="space-y-0.5 text-[11px]">
                              <span className="text-muted-foreground block">
                                Signed: {new Date(sess.created_at).toLocaleString()}
                              </span>
                              <span className="font-medium text-foreground block">
                                Active: {new Date(sess.last_activity_at).toLocaleString()}
                              </span>
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="py-3">
                            <div className="space-y-1">
                              <Badge
                                variant={
                                  sess.status === "active"
                                    ? "default"
                                    : sess.status === "restricted"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-[10px] uppercase font-bold"
                              >
                                {sess.status}
                              </Badge>
                              {sess.is_current && (
                                <span className="block text-[10px] text-emerald-600 font-semibold">
                                  (Your Session)
                                </span>
                              )}
                              {sess.termination_reason && (
                                <span className="block text-[10px] text-muted-foreground truncate max-w-[140px]" title={sess.termination_reason}>
                                  {sess.termination_reason}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isActive && canTerminate && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setTerminateTarget(sess)}
                                  className="h-7 text-[11px] px-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                                >
                                  <LogOut className="h-3 w-3 mr-1" />
                                  Terminate
                                </Button>
                              )}

                              {isActive && canTerminateAll && sess.user && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setTerminateUserTarget({
                                      userId: sess.user_id || sess.user!.user_id,
                                      userName: sess.user!.full_name,
                                    })
                                  }
                                  className="h-7 text-[11px] px-2 text-muted-foreground hover:text-destructive"
                                  title="Terminate all sessions for this user"
                                >
                                  Terminate All
                                </Button>
                              )}

                              {canRestrictIp && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setNewIpAddress(sess.ip_address);
                                    setShowAddIpDialog(true);
                                  }}
                                  className="h-7 text-[11px] px-2 text-muted-foreground hover:text-destructive"
                                  title="Block this IP address"
                                >
                                  Block IP
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10 text-xs text-muted-foreground">
                <span>
                  Showing page {meta.page} of {meta.totalPages} ({meta.total} total sessions)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={meta.page <= 1}
                    className="h-7 px-2"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    disabled={meta.page >= meta.totalPages}
                    className="h-7 px-2"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 2: DEVICE RESTRICTIONS */}
        {/* ======================================================== */}
        <TabsContent value="devices" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Enforced Device Restrictions</h2>
              <p className="text-xs text-muted-foreground">
                Blocked device signatures cannot establish sessions within this domain
              </p>
            </div>
            {canRestrictDevice && (
              <Button
                size="sm"
                onClick={() => setShowAddDeviceDialog(true)}
                className="h-8 gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Restrict New Device</span>
              </Button>
            )}
          </div>

          <Card className="rounded-xl border shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Device Info</TableHead>
                    <TableHead className="text-xs font-semibold">Scope / Target</TableHead>
                    <TableHead className="text-xs font-semibold">Reason</TableHead>
                    <TableHead className="text-xs font-semibold">Restricted By</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingDevices ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        <span className="text-xs text-muted-foreground mt-2 block">
                          Loading device restrictions...
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : (deviceRestrictionsData?.data || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                        No active device restrictions in this scope.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (deviceRestrictionsData?.data || []).map((dev) => (
                      <TableRow key={dev.restriction_id}>
                        <TableCell className="py-3">
                          <div className="flex items-start gap-2.5">
                            <div className="p-1.5 rounded-lg bg-muted border mt-0.5">
                              {getDeviceIcon(dev.device_type || "desktop")}
                            </div>
                            <div className="space-y-0.5">
                              <span className="font-semibold text-xs text-foreground block">
                                {dev.device_name || "Restricted Device"}
                              </span>
                              <span className="text-[11px] text-muted-foreground block">
                                {dev.operating_system || "Unknown OS"} • {dev.browser || "Unknown"}
                              </span>
                              <span className="font-mono text-[9px] text-muted-foreground/70 block">
                                Hash: {dev.device_fingerprint_hash.substring(0, 16)}...
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-3 text-xs">
                          {dev.user ? (
                            <div className="space-y-0.5">
                              <span className="font-medium text-foreground block">{dev.user.full_name}</span>
                              <span className="text-[11px] text-muted-foreground block">{dev.user.email}</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {dev.domain} Domain (All Users)
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="py-3 text-xs">
                          <span className="font-medium text-destructive block">{dev.restriction_reason}</span>
                          {dev.expires_at && (
                            <span className="text-[10px] text-muted-foreground block">
                              Expires: {new Date(dev.expires_at).toLocaleString()}
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="py-3 text-xs text-muted-foreground">
                          <span>{dev.restrictedByUser?.full_name || "Administrator"}</span>
                          <span className="block text-[10px]">
                            {new Date(dev.restricted_at).toLocaleDateString()}
                          </span>
                        </TableCell>

                        <TableCell className="py-3">
                          <Badge
                            variant={dev.is_active ? "destructive" : "secondary"}
                            className="text-[10px] uppercase font-bold"
                          >
                            {dev.is_active ? "Restricted" : "Unrestricted"}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3 text-right">
                          {dev.is_active && canUnrestrictDevice && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setUnrestrictDeviceTarget(dev)}
                              className="h-7 text-[11px] px-2 text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Unrestrict
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 3: IP RESTRICTIONS */}
        {/* ======================================================== */}
        <TabsContent value="ips" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Enforced IP Address Restrictions</h2>
              <p className="text-xs text-muted-foreground">
                Blocked IP addresses or subnets are denied authorization system-wide
              </p>
            </div>
            {canRestrictIp && (
              <Button
                size="sm"
                onClick={() => setShowAddIpDialog(true)}
                className="h-8 gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Block IP / Subnet</span>
              </Button>
            )}
          </div>

          <Card className="rounded-xl border shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">IP Address / CIDR</TableHead>
                    <TableHead className="text-xs font-semibold">Domain Scope</TableHead>
                    <TableHead className="text-xs font-semibold">Restriction Reason</TableHead>
                    <TableHead className="text-xs font-semibold">Restricted By</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingIps ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        <span className="text-xs text-muted-foreground mt-2 block">
                          Loading IP restrictions...
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : (ipRestrictionsData?.data || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                        No active IP restrictions configured in this scope.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (ipRestrictionsData?.data || []).map((ip) => (
                      <TableRow key={ip.restriction_id}>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-destructive" />
                            <div>
                              <span className="font-mono text-xs font-bold text-foreground block">
                                {ip.ip_address}
                              </span>
                              {ip.is_cidr && (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                  CIDR Subnet
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-3 text-xs">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {ip.domain}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3 text-xs">
                          <span className="font-medium text-destructive block">{ip.restriction_reason}</span>
                          {ip.expires_at && (
                            <span className="text-[10px] text-muted-foreground block">
                              Expires: {new Date(ip.expires_at).toLocaleString()}
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="py-3 text-xs text-muted-foreground">
                          <span>{ip.restrictedByUser?.full_name || "Administrator"}</span>
                          <span className="block text-[10px]">
                            {new Date(ip.restricted_at).toLocaleDateString()}
                          </span>
                        </TableCell>

                        <TableCell className="py-3">
                          <Badge
                            variant={ip.is_active ? "destructive" : "secondary"}
                            className="text-[10px] uppercase font-bold"
                          >
                            {ip.is_active ? "Blocked" : "Unblocked"}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3 text-right">
                          {ip.is_active && canUnrestrictIp && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setUnrestrictIpTarget(ip)}
                              className="h-7 text-[11px] px-2 text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Unblock IP
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 4: AUDIT LOGS */}
        {/* ======================================================== */}
        {canViewAudit && (
          <TabsContent value="audit" className="space-y-4 mt-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Session Security & Audit Log</h2>
              <p className="text-xs text-muted-foreground">
                Historical record of authentication events, remote terminations, and security blocks
              </p>
            </div>

            <Card className="rounded-xl border shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Event Type</TableHead>
                      <TableHead className="text-xs font-semibold">Actor / User</TableHead>
                      <TableHead className="text-xs font-semibold">IP Address</TableHead>
                      <TableHead className="text-xs font-semibold">Timestamp</TableHead>
                      <TableHead className="text-xs font-semibold">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingLogs ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                          <span className="text-xs text-muted-foreground mt-2 block">
                            Loading security audit logs...
                          </span>
                        </TableCell>
                      </TableRow>
                    ) : (auditLogsData?.data || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground">
                          No audit events recorded yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (auditLogsData?.data || []).map((log) => (
                        <TableRow key={log.log_id}>
                          <TableCell className="py-3">
                            <Badge
                              variant={
                                log.event_type.includes("block") || log.event_type.includes("restrict")
                                  ? "destructive"
                                  : log.event_type.includes("terminate")
                                  ? "secondary"
                                  : "outline"
                              }
                              className="text-[10px] uppercase font-bold"
                            >
                              {log.event_type}
                            </Badge>
                          </TableCell>

                          <TableCell className="py-3 text-xs">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-foreground block">
                                {log.user?.full_name || log.actor?.full_name || "System"}
                              </span>
                              <span className="text-[11px] text-muted-foreground block">
                                {log.user?.email || log.actor?.email || "N/A"}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="py-3 font-mono text-xs text-muted-foreground">
                            {log.ip_address || "—"}
                          </TableCell>

                          <TableCell className="py-3 text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </TableCell>

                          <TableCell className="py-3 text-xs text-muted-foreground font-mono text-[11px]">
                            {log.details ? JSON.stringify(log.details) : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ======================================================== */}
      {/* DIALOGS */}
      {/* ======================================================== */}

      {/* Terminate Single Session Dialog */}
      <Dialog open={!!terminateTarget} onOpenChange={(open) => !open && setTerminateTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <LogOut className="h-5 w-5" />
              Terminate Active Session
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Terminate active session for <strong>{terminateTarget?.user?.full_name}</strong> on{" "}
              <strong>{terminateTarget?.device_name}</strong> ({terminateTarget?.ip_address}). The user
              will be immediately kicked out.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs">Reason for Termination</Label>
            <Input
              placeholder="e.g. Administrative security audit, suspicious activity"
              value={terminateReason}
              onChange={(e) => setTerminateReason(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setTerminateTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmTerminate}
              disabled={isTerminating}
            >
              {isTerminating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Terminate Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminate All Sessions for a User Dialog */}
      <Dialog open={!!terminateUserTarget} onOpenChange={(open) => !open && setTerminateUserTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Terminate All Sessions for User
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              This will revoke <strong>ALL</strong> active authenticated sessions for{" "}
              <strong>{terminateUserTarget?.userName}</strong> across all devices, requiring fresh sign in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs">Reason for Termination</Label>
            <Input
              placeholder="e.g. Account compromise investigation, privilege revocation"
              value={terminateUserReason}
              onChange={(e) => setTerminateUserReason(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setTerminateUserTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmTerminateUser}
              disabled={isTerminatingUser}
            >
              {isTerminatingUser ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Terminate All Sessions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Device Restriction Dialog */}
      <Dialog open={showAddDeviceDialog} onOpenChange={setShowAddDeviceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              Enforce Device Restriction
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Block a specific hardware device signature from establishing sessions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Device Fingerprint Hash *</Label>
              <Input
                placeholder="64-character SHA-256 fingerprint hash"
                value={newDeviceHash}
                onChange={(e) => setNewDeviceHash(e.target.value)}
                className="font-mono text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Device Name / Label</Label>
                <Input
                  placeholder="e.g. Suspicious Dell Laptop"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Device Type</Label>
                <Select value={newDeviceType} onValueChange={setNewDeviceType}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desktop">Desktop</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                    <SelectItem value="tablet">Tablet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Reason for Block *</Label>
              <Textarea
                placeholder="Document reason for restriction..."
                value={newDeviceReason}
                onChange={(e) => setNewDeviceReason(e.target.value)}
                className="text-xs min-h-[60px]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Restriction Duration</Label>
              <Select value={newDeviceDuration} onValueChange={setNewDeviceDuration}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Permanent (Until manual unrestriction)</SelectItem>
                  <SelectItem value="60">1 Hour</SelectItem>
                  <SelectItem value="1440">24 Hours (1 Day)</SelectItem>
                  <SelectItem value="10080">7 Days</SelectItem>
                  <SelectItem value="43200">30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShowAddDeviceDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCreateDeviceRestriction}
              disabled={!newDeviceHash.trim() || !newDeviceReason.trim() || isRestrictingDevice}
            >
              {isRestrictingDevice ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Enforce Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unrestrict Device Dialog */}
      <Dialog open={!!unrestrictDeviceTarget} onOpenChange={(open) => !open && setUnrestrictDeviceTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <RotateCcw className="h-5 w-5" />
              Remove Device Restriction
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Are you sure you want to restore access for device{" "}
              <strong>{unrestrictDeviceTarget?.device_name || unrestrictDeviceTarget?.device_fingerprint_hash}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setUnrestrictDeviceTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmUnrestrictDevice}
              disabled={isDeletingDeviceRestriction}
            >
              {isDeletingDeviceRestriction ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Restore Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add IP Restriction Dialog */}
      <Dialog open={showAddIpDialog} onOpenChange={setShowAddIpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Globe className="h-5 w-5" />
              Block IP Address or CIDR Range
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Deny authorization to all login requests originating from this IP or subnet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">IP Address or CIDR *</Label>
              <Input
                placeholder="e.g. 192.168.1.100 or 10.0.0.0/24"
                value={newIpAddress}
                onChange={(e) => {
                  setNewIpAddress(e.target.value);
                  if (e.target.value.includes("/")) setNewIpIsCidr(true);
                }}
                className="font-mono text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Reason for IP Block *</Label>
              <Textarea
                placeholder="e.g. Brute-force attacks, untrusted external proxy"
                value={newIpReason}
                onChange={(e) => setNewIpReason(e.target.value)}
                className="text-xs min-h-[60px]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Block Duration</Label>
              <Select value={newIpDuration} onValueChange={setNewIpDuration}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Permanent (Until manual removal)</SelectItem>
                  <SelectItem value="60">1 Hour</SelectItem>
                  <SelectItem value="1440">24 Hours (1 Day)</SelectItem>
                  <SelectItem value="10080">7 Days</SelectItem>
                  <SelectItem value="43200">30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShowAddIpDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCreateIpRestriction}
              disabled={!newIpAddress.trim() || !newIpReason.trim() || isRestrictingIp}
            >
              {isRestrictingIp ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Enforce IP Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unrestrict IP Dialog */}
      <Dialog open={!!unrestrictIpTarget} onOpenChange={(open) => !open && setUnrestrictIpTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <RotateCcw className="h-5 w-5" />
              Remove IP Address Block
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Are you sure you want to unblock IP address{" "}
              <strong>{unrestrictIpTarget?.ip_address}</strong>? Requests from this address will
              once again be allowed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setUnrestrictIpTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmUnrestrictIp}
              disabled={isDeletingIpRestriction}
            >
              {isDeletingIpRestriction ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Unblock IP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

