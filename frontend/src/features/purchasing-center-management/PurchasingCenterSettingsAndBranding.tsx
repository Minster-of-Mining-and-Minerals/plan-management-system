"use strict";
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import {
  Paintbrush,
  Store,
  Palette,
  Save,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { actionFeedback } from "@/components/action-feedback";
import { LogoUploadField } from "@/components/common/LogoUploadField";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/use-auth";
import {
  useGetPurchasingCenterBrandingQuery,
  useUpdatePurchasingCenterBrandingMutation,
} from "@/redux/api/purchasingCenterApi";
import type { PurchasingCenterBrandingData } from "@/redux/types/purchasingCenter";
import Loading01 from "@/features/template/component/Loading/Loading01";

interface BrandingFormProps {
  centerId: string;
  initialData?: PurchasingCenterBrandingData | null;
  canManageBranding: boolean;
  onSaved: () => void;
}

function PurchasingCenterBrandingForm({
  centerId,
  initialData,
  canManageBranding,
  onSaved,
}: BrandingFormProps) {
  const [updateBranding, { isLoading: isUpdating }] = useUpdatePurchasingCenterBrandingMutation();

  const [systemFullName, setSystemFullName] = useState(initialData?.system_name_full || "");
  const [systemShortName, setSystemShortName] = useState(initialData?.system_name_short || "");
  const [systemTagline, setSystemTagline] = useState(initialData?.system_tagline || "");
  const [logoPrimaryPath, setLogoPrimaryPath] = useState(initialData?.logo_primary_path || "");
  const [primaryColor, setPrimaryColor] = useState(initialData?.primary_color || "#0f766e");
  const [secondaryColor, setSecondaryColor] = useState(initialData?.secondary_color || "#0d9488");
  const [accentColor, setAccentColor] = useState(initialData?.accent_color || "#f59e0b");
  const [sidebarColor, setSidebarColor] = useState(initialData?.sidebar_color || "");
  const [headerColor, setHeaderColor] = useState(initialData?.header_color || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerId) return;

    try {
      await updateBranding({
        purchasing_center_id: centerId,
        data: {
          system_name_full: systemFullName.trim(),
          system_name_short: systemShortName.trim(),
          system_tagline: systemTagline.trim() || undefined,
          logo_primary_path: logoPrimaryPath || undefined,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
          sidebar_color: sidebarColor || undefined,
          header_color: headerColor || undefined,
        },
      }).unwrap();

      actionFeedback.success("Purchasing center branding settings saved successfully.");
      onSaved();
    } catch (err: unknown) {
      const errorMsg = (err as { data?: { message?: string } })?.data?.message || "Failed to update branding settings.";
      actionFeedback.error(errorMsg);
    }
  };

  const handleResetToDefaults = () => {
    setPrimaryColor("#0f766e");
    setSecondaryColor("#0d9488");
    setAccentColor("#f59e0b");
    setSidebarColor("");
    setHeaderColor("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identity & Display Names */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" />
            Center Identity & Titles
          </CardTitle>
          <CardDescription>
            Displayed across header banners, navigation bars, and administrative views.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Full System Name</label>
              <Input
                value={systemFullName}
                onChange={(e) => setSystemFullName(e.target.value)}
                placeholder="e.g. Shakiso Gold Purchasing Center"
                disabled={!canManageBranding}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Short Name / Acronym</label>
              <Input
                value={systemShortName}
                onChange={(e) => setSystemShortName(e.target.value)}
                placeholder="e.g. PC-SHAKISO"
                disabled={!canManageBranding}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Tagline or Operational Motto</label>
            <Input
              value={systemTagline}
              onChange={(e) => setSystemTagline(e.target.value)}
              placeholder="e.g. Secure & Transparent Mineral Procurement"
              disabled={!canManageBranding}
            />
          </div>
        </CardContent>
      </Card>

      {/* Color Palette */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            Color Palette & Theme
          </CardTitle>
          <CardDescription>
            Sets the primary, secondary, and accent colors for this center&apos;s workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Primary Brand Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  disabled={!canManageBranding}
                  className="h-10 w-12 rounded border cursor-pointer shrink-0"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  disabled={!canManageBranding}
                  className="font-mono text-xs uppercase"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  disabled={!canManageBranding}
                  className="h-10 w-12 rounded border cursor-pointer shrink-0"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  disabled={!canManageBranding}
                  className="font-mono text-xs uppercase"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  disabled={!canManageBranding}
                  className="h-10 w-12 rounded border cursor-pointer shrink-0"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  disabled={!canManageBranding}
                  className="font-mono text-xs uppercase"
                />
              </div>
            </div>
          </div>

          {canManageBranding && (
            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetToDefaults}
                className="gap-1.5 text-xs text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Palette Defaults
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Center Official Emblem / Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Official Emblem / Logo</CardTitle>
          <CardDescription>
            Displayed on sidebar headers, welcome panels, and printed procurement reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUploadField
            label="Purchasing Center Logo"
            value={logoPrimaryPath}
            onChange={(val) => setLogoPrimaryPath(val || "")}
            disabled={!canManageBranding}
          />
        </CardContent>
      </Card>

      {/* Submit */}
      {canManageBranding && (
        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" disabled={isUpdating} className="gap-2">
            <Save className="h-4 w-4" />
            {isUpdating ? "Saving Changes..." : "Save Branding Configuration"}
          </Button>
        </div>
      )}
    </form>
  );
}

export function PurchasingCenterSettingsAndBranding() {
  const { data: session } = useSession();
  const params = useParams<{ id: string }>();
  const sessionUser = session?.user as (Record<string, unknown> & { purchasing_center_id?: string }) | undefined;
  const centerId = params?.id || sessionUser?.purchasing_center_id;

  const { can } = usePermissions();
  const { roles: userRoles } = useAuth();
  const isSuperAdmin = userRoles?.some((r) => String(r).toLowerCase() === "super admin");

  const canManageBranding =
    can("PURCHASING_CENTER_BRANDING:UPDATE") ||
    can("PURCHASING_CENTER_BRANDING:MANAGE") ||
    isSuperAdmin;

  const {
    data: brandingData,
    isLoading,
    refetch,
  } = useGetPurchasingCenterBrandingQuery(centerId || "", {
    skip: !centerId,
  });

  if (isLoading) {
    return <Loading01 />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Paintbrush className="h-6 w-6 text-primary" />
          Purchasing Center Branding & Appearance
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize the appearance, official logo, and identity of this purchasing center&apos;s independent workspace.
        </p>
      </div>

      <PurchasingCenterBrandingForm
        key={brandingData?.branding_id || centerId || "branding-form"}
        centerId={centerId || ""}
        initialData={brandingData}
        canManageBranding={canManageBranding}
        onSaved={refetch}
      />
    </div>
  );
}
