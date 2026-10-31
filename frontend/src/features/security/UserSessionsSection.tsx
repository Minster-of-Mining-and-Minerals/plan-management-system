"use client";

import { useState } from "react";
import {
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Shield,
  ShieldAlert,
  ShieldCheck,
  LogOut,
  Ban,
  RotateCcw,
  Clock,
  MapPin,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actionFeedback } from "@/components/action-feedback";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useGetMySessionsQuery,
  useGetMyDevicesQuery,
  useTerminateMySessionMutation,
  useTerminateOtherSessionsMutation,
  useRestrictMyDeviceMutation,
  useUnrestrictMyDeviceMutation,
  UserSessionItem,
  UserDeviceItem,
} from "@/redux/api/sessionApi";

function getDeviceIcon(deviceType: string) {
  const dt = (deviceType || "").toLowerCase();
  if (dt.includes("mobile") || dt.includes("phone")) {
    return <Smartphone className="h-5 w-5 text-blue-500" />;
  }
  if (dt.includes("tablet") || dt.includes("ipad")) {
    return <Tablet className="h-5 w-5 text-purple-500" />;
  }
  if (dt.includes("laptop")) {
    return <Laptop className="h-5 w-5 text-emerald-500" />;
  }
  return <Monitor className="h-5 w-5 text-indigo-500" />;
}

export function UserSessionsSection() {
  const { can, canAny } = usePermissions();

  const canView = canAny(["USER_SESSION:VIEW_OWN", "USER_SESSION:VIEW"]);
  const canTerminateOwn = canAny(["USER_SESSION:TERMINATE_OWN", "USER_SESSION:TERMINATE"]);
  const canTerminateAllOwn = canAny(["USER_SESSION:TERMINATE_ALL_OWN", "USER_SESSION:TERMINATE_ALL"]);
  const canRestrictOwn = canAny(["USER_SESSION:RESTRICT_OWN_DEVICE", "USER_SESSION:RESTRICT_DEVICE"]);
  const canUnrestrictOwn = canAny(["USER_SESSION:UNRESTRICT_OWN_DEVICE", "USER_SESSION:UNRESTRICT_DEVICE"]);

  const {
    data: sessions = [],
    isLoading: isLoadingSessions,
    isFetching: isFetchingSessions,
    refetch: refetchSessions,
  } = useGetMySessionsQuery(undefined, { skip: !canView });

  const {
    data: devices = [],
    isLoading: isLoadingDevices,
    refetch: refetchDevices,
  } = useGetMyDevicesQuery(undefined, { skip: !canView });

  const [terminateSession, { isLoading: isTerminating }] = useTerminateMySessionMutation();
  const [terminateOther, { isLoading: isTerminatingOther }] = useTerminateOtherSessionsMutation();
  const [restrictDevice, { isLoading: isRestricting }] = useRestrictMyDeviceMutation();
  const [unrestrictDevice, { isLoading: isUnrestricting }] = useUnrestrictMyDeviceMutation();

  // Dialog States
  const [terminateTarget, setTerminateTarget] = useState<UserSessionItem | null>(null);
  const [showTerminateOtherDialog, setShowTerminateOtherDialog] = useState(false);
  const [restrictTarget, setRestrictTarget] = useState<{
    hash: string;
    name: string;
    type?: string;
    os?: string;
    browser?: string;
  } | null>(null);
  const [restrictReason, setRestrictReason] = useState("");
  const [restrictDuration, setRestrictDuration] = useState("0");
  const [unrestrictTarget, setUnrestrictTarget] = useState<UserDeviceItem | null>(null);

  if (!canView) {
    return null;
  }

  const activeSessions = sessions.filter((s) => s.status === "active");
  const otherActiveCount = activeSessions.filter((s) => !s.is_current).length;

  const handleConfirmTerminate = async () => {
    if (!terminateTarget) return;
    try {
      await terminateSession({ sessionId: terminateTarget.session_id }).unwrap();
      actionFeedback.success("Session terminated successfully");
      setTerminateTarget(null);
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to terminate session");
    }
  };

  const handleConfirmTerminateOther = async () => {
    try {
      const res = await terminateOther().unwrap();
      actionFeedback.success(`Successfully terminated ${res.terminated_count} other active session(s)`);
      setShowTerminateOtherDialog(false);
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to terminate other sessions");
    }
  };

  const handleConfirmRestrict = async () => {
    if (!restrictTarget || !restrictReason.trim()) return;
    try {
      await restrictDevice({
        device_fingerprint_hash: restrictTarget.hash,
        device_name: restrictTarget.name,
        device_type: restrictTarget.type,
        operating_system: restrictTarget.os,
        browser: restrictTarget.browser,
        reason: restrictReason.trim(),
        duration_minutes: parseInt(restrictDuration, 10) > 0 ? parseInt(restrictDuration, 10) : undefined,
      }).unwrap();
      actionFeedback.success("Device restricted successfully. All sessions from this device have been revoked.");
      setRestrictTarget(null);
      setRestrictReason("");
      setRestrictDuration("0");
      refetchDevices();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to restrict device");
    }
  };

  const handleConfirmUnrestrict = async () => {
    if (!unrestrictTarget?.restriction_id) return;
    try {
      await unrestrictDevice({ restriction_id: unrestrictTarget.restriction_id }).unwrap();
      actionFeedback.success("Device access restored successfully");
      setUnrestrictTarget(null);
      refetchDevices();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to restore device access");
    }
  };

  return (
    <Card className="rounded-2xl border shadow-xs overflow-hidden">
      <CardHeader className="border-b pb-4 bg-muted/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                Active Sessions & Devices
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  {activeSessions.length} active
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Monitor and manage devices authorized to access your account
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchSessions();
                refetchDevices();
              }}
              disabled={isFetchingSessions}
              className="h-8 gap-1 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetchingSessions ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>

            {canTerminateAllOwn && otherActiveCount > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowTerminateOtherDialog(true)}
                className="h-8 gap-1.5 text-xs"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout All Other Devices ({otherActiveCount})</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs defaultValue="sessions" className="w-full">
          <div className="border-b px-4 pt-2 bg-muted/5">
            <TabsList className="bg-transparent h-9 p-0 gap-4">
              <TabsTrigger
                value="sessions"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-2 pb-2 text-xs font-semibold"
              >
                Active Sessions ({activeSessions.length})
              </TabsTrigger>
              <TabsTrigger
                value="devices"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-2 pb-2 text-xs font-semibold"
              >
                Recognized Devices ({devices.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="p-4 m-0 space-y-3">
            {isLoadingSessions ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs">Loading sessions...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No active sessions found.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {sessions.map((sess) => {
                  const isActive = sess.status === "active";
                  return (
                    <div
                      key={sess.session_id}
                      className={`rounded-xl border p-4 transition-all ${
                        sess.is_current
                          ? "border-emerald-500/40 bg-emerald-500/5 shadow-xs"
                          : isActive
                          ? "border-border bg-card hover:border-muted-foreground/30"
                          : "border-border/60 bg-muted/10 opacity-70"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-background border mt-0.5 shrink-0">
                            {getDeviceIcon(sess.device_type)}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">
                                {sess.device_name || "Unknown Device"}
                              </span>
                              {sess.is_current && (
                                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] px-2 py-0.5 flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                                  Current Device
                                </Badge>
                              )}
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
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>
                                {sess.operating_system} • {sess.browser} {sess.browser_version}
                              </span>
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {sess.ip_address}
                              </span>
                              {sess.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {sess.location}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground/80 pt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Signed in: {new Date(sess.created_at).toLocaleString()}
                              </span>
                              <span>
                                Last active: {new Date(sess.last_activity_at).toLocaleString()}
                              </span>
                              <span className="font-mono text-[10px] text-muted-foreground/60">
                                ID: {sess.masked_id}
                              </span>
                            </div>

                            {sess.termination_reason && (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                                Reason: {sess.termination_reason}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {isActive && !sess.is_current && canTerminateOwn && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setTerminateTarget(sess)}
                              className="h-8 gap-1 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                            >
                              <LogOut className="h-3.5 w-3.5" />
                              <span>Logout</span>
                            </Button>
                          )}

                          {canRestrictOwn && !sess.is_current && sess.device_fingerprint_hash && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setRestrictTarget({
                                  hash: sess.device_fingerprint_hash!,
                                  name: sess.device_name,
                                  type: sess.device_type,
                                  os: sess.operating_system,
                                  browser: sess.browser,
                                })
                              }
                              className="h-8 gap-1 text-xs text-muted-foreground hover:text-destructive"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              <span>Restrict</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Devices Tab */}
          <TabsContent value="devices" className="p-4 m-0 space-y-3">
            {isLoadingDevices ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs">Loading recognized devices...</span>
              </div>
            ) : devices.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No recognized devices found.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {devices.map((dev) => (
                  <div
                    key={dev.device_fingerprint_hash}
                    className={`rounded-xl border p-4 transition-all ${
                      dev.is_restricted
                        ? "border-destructive/40 bg-destructive/5"
                        : dev.is_current
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-background border mt-0.5 shrink-0">
                          {getDeviceIcon(dev.device_type)}
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">
                              {dev.device_name}
                            </span>
                            {dev.is_current && (
                              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] px-2 py-0.5">
                                Current Device
                              </Badge>
                            )}
                            {dev.is_restricted ? (
                              <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                                Restricted Device
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                Authorized Device
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>
                              {dev.operating_system} • {dev.browser}
                            </span>
                            {dev.last_ip && (
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {dev.last_ip}
                              </span>
                            )}
                            {dev.last_active_at && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Last activity: {new Date(dev.last_active_at).toLocaleString()}
                              </span>
                            )}
                          </div>

                          {dev.is_restricted && (
                            <div className="p-2 rounded-lg bg-destructive/10 text-destructive text-xs space-y-0.5 mt-2">
                              <p className="font-semibold">Restriction Reason: {dev.restriction_reason}</p>
                              {dev.restricted_at && (
                                <p className="text-[11px] text-muted-foreground">
                                  Restricted on: {new Date(dev.restricted_at).toLocaleString()}
                                </p>
                              )}
                              {dev.expires_at && (
                                <p className="text-[11px] text-muted-foreground">
                                  Expires: {new Date(dev.expires_at).toLocaleString()}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Device Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {dev.is_restricted && canUnrestrictOwn ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUnrestrictTarget(dev)}
                            className="h-8 gap-1.5 text-xs text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Restore Access</span>
                          </Button>
                        ) : (
                          canRestrictOwn &&
                          !dev.is_current && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setRestrictTarget({
                                  hash: dev.device_fingerprint_hash,
                                  name: dev.device_name,
                                  type: dev.device_type,
                                  os: dev.operating_system,
                                  browser: dev.browser,
                                })
                              }
                              className="h-8 gap-1.5 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              <span>Restrict Device</span>
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Dialog: Terminate Single Session */}
      <Dialog open={!!terminateTarget} onOpenChange={(open) => !open && setTerminateTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <LogOut className="h-5 w-5" />
              Terminate Active Session
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Are you sure you want to log out this session on{" "}
              <strong>{terminateTarget?.device_name}</strong> ({terminateTarget?.ip_address})?
              The affected device will immediately lose access and be prompted to sign in again.
            </DialogDescription>
          </DialogHeader>
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

      {/* Dialog: Terminate All Other Sessions */}
      <Dialog
        open={showTerminateOtherDialog}
        onOpenChange={(open) => !open && setShowTerminateOtherDialog(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Logout All Other Devices
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              This will immediately invalidate all {otherActiveCount} other active sessions across
              your computers, phones, and tablets. Your current session will remain active.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShowTerminateOtherDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmTerminateOther}
              disabled={isTerminatingOther}
            >
              {isTerminatingOther ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Terminate All Other Sessions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Restrict Device */}
      <Dialog open={!!restrictTarget} onOpenChange={(open) => !open && setRestrictTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              Restrict Device Access
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Completely block <strong>{restrictTarget?.name}</strong> from establishing new
              sessions for your account. Any active sessions on this device will be immediately terminated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Reason for Restriction *</Label>
              <Textarea
                placeholder="e.g. Lost laptop, unauthorized login suspicion, retired workstation"
                value={restrictReason}
                onChange={(e) => setRestrictReason(e.target.value)}
                className="text-xs min-h-[70px]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Restriction Duration</Label>
              <Select value={restrictDuration} onValueChange={setRestrictDuration}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Select duration" />
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
            <Button variant="outline" size="sm" onClick={() => setRestrictTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmRestrict}
              disabled={!restrictReason.trim() || isRestricting}
            >
              {isRestricting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Confirm Restriction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Unrestrict Device */}
      <Dialog open={!!unrestrictTarget} onOpenChange={(open) => !open && setUnrestrictTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <RotateCcw className="h-5 w-5" />
              Restore Device Access
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Are you sure you want to remove the restriction on{" "}
              <strong>{unrestrictTarget?.device_name}</strong>? This device will once again be
              allowed to sign into your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setUnrestrictTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmUnrestrict}
              disabled={isUnrestricting}
              className="gap-1"
            >
              {isUnrestricting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Confirm Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

