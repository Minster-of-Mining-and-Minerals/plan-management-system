"use client";

import { useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { actionFeedback } from "@/components/action-feedback";
import { PermissionGuard } from "@/utils/PermissionGuard";
import {
  useGetSystemSettingsQuery,
  useUpdateSystemSettingsMutation,
} from "@/redux/api/systemSettingsApi";

const SYSTEM_SETTINGS_READ = ["SYSTEM_SETTINGS:READ"] as const;
const SYSTEM_SETTINGS_UPDATE = ["SYSTEM_SETTINGS:UPDATE"] as const;

export default function SystemSettingsPage() {
  const { data: settings, isLoading } = useGetSystemSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateSystemSettingsMutation();

  const exposeRequiredPermissions = Boolean(settings?.expose_required_permissions);

  const handleToggle = async (checked: boolean) => {
    try {
      await updateSettings({ expose_required_permissions: checked }).unwrap();
      actionFeedback.success("System settings updated");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err.data?.message || "Failed to update system settings");
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading system settings...</div>;
  }

  return (
    <PermissionGuard requireAll={[...SYSTEM_SETTINGS_READ]}>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Security and platform behavior options. Keep permission disclosure disabled in
            production unless administrators need it for support.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Permission disclosure</CardTitle>
            <CardDescription>
              When enabled, access-denied pages and API errors include the required permission
              keys. When disabled, users only see a generic access denied message.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-1">
                <Label htmlFor="expose_required_permissions" className="text-base">
                  Show required permissions on access denied
                </Label>
                <p className="text-sm text-muted-foreground">
                  Recommended: off in production, on in development or staging for RBAC
                  troubleshooting.
                </p>
              </div>
              <PermissionGuard requireAll={[...SYSTEM_SETTINGS_UPDATE]}>
                <Switch
                  id="expose_required_permissions"
                  checked={exposeRequiredPermissions}
                  disabled={isSaving}
                  onCheckedChange={(checked) => void handleToggle(checked)}
                />
              </PermissionGuard>
            </div>

            <PermissionGuard requireAll={[...SYSTEM_SETTINGS_UPDATE]}>
              <Button
                variant="outline"
                disabled={isSaving || !exposeRequiredPermissions}
                onClick={() => void handleToggle(false)}
              >
                Turn off permission disclosure
              </Button>
            </PermissionGuard>
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
