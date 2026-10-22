"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import {
  Paintbrush,
  Save,
  Loader2,
  Sparkles,
  RotateCcw,
  Building2,
  Palette,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogoUploadField } from "@/components/common/LogoUploadField";
import { actionFeedback } from "@/components/action-feedback";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/use-auth";
import { getFileUrl } from "@/utils/fileUrl";
import {
  useGetRegionalBrandingQuery,
  useUpdateRegionalBrandingMutation,
} from "@/redux/api/regionApi";
import Loading01 from "@/features/template/component/Loading/Loading01";

export function RegionalSettingsAndBranding() {
  const { data: session } = useSession();
  const regionId = session?.user?.region_id;

  const { can } = usePermissions();
  const { roles: userRoles } = useAuth();
  const isSuperAdmin = userRoles?.some((r) => String(r).toLowerCase() === "super admin");

  const canManageBranding =
    can("REGIONAL_BRANDING:UPDATE") ||
    can("REGIONAL_BRANDING:MANAGE") ||
    isSuperAdmin;

  const {
    data: brandingData,
    isLoading,
    refetch,
  } = useGetRegionalBrandingQuery(regionId || "", {
    skip: !regionId,
  });

  const [updateBranding, { isLoading: isUpdating }] = useUpdateRegionalBrandingMutation();

  // Form State
  const [systemFullName, setSystemFullName] = useState("");
  const [systemShortName, setSystemShortName] = useState("");
  const [systemTagline, setSystemTagline] = useState("");
  const [logoPrimaryPath, setLogoPrimaryPath] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0f766e");
  const [secondaryColor, setSecondaryColor] = useState("#0d9488");
  const [accentColor, setAccentColor] = useState("#f59e0b");
  const [sidebarColor, setSidebarColor] = useState("");
  const [headerColor, setHeaderColor] = useState("");

  useEffect(() => {
    if (brandingData) {
      setSystemFullName(brandingData.system_name_full || "");
      setSystemShortName(brandingData.system_name_short || "");
      setSystemTagline(brandingData.system_tagline || "");
      setLogoPrimaryPath(brandingData.logo_primary_path || "");
      setPrimaryColor(brandingData.primary_color || "#0f766e");
      setSecondaryColor(brandingData.secondary_color || "#0d9488");
      setAccentColor(brandingData.accent_color || "#f59e0b");
      setSidebarColor(brandingData.sidebar_color || "");
      setHeaderColor(brandingData.header_color || "");
    }
  }, [brandingData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regionId) return;

    try {
      await updateBranding({
        region_id: regionId,
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

      actionFeedback.success("Regional branding settings saved successfully.");
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to update branding settings.");
    }
  };

  const handleResetToDefault = () => {
    setPrimaryColor("#0f766e");
    setSecondaryColor("#0d9488");
    setAccentColor("#f59e0b");
    setSidebarColor("");
    setHeaderColor("");
  };

  if (isLoading) {
    return <Loading01 />;
  }

  const resolvedLogoUrl = logoPrimaryPath ? getFileUrl(logoPrimaryPath) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Paintbrush className="h-6 w-6 text-primary" />
          Regional Settings & Branding
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure region-specific branding, official emblems, identity titles, and theme colors.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Settings Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="border border-border/70 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Regional Authority Identity
                </CardTitle>
                <CardDescription className="text-xs">
                  Official system names and tagline displayed across regional workspaces and navigation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Full System Name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={systemFullName}
                      onChange={(e) => setSystemFullName(e.target.value)}
                      placeholder="e.g. Oromia Mineral Development Bureau PMS"
                      disabled={!canManageBranding}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Short Name / Acronym <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={systemShortName}
                      onChange={(e) => setSystemShortName(e.target.value)}
                      placeholder="e.g. OR-MDB PMS"
                      disabled={!canManageBranding}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Regional Tagline / Mission Statement
                  </label>
                  <Input
                    value={systemTagline}
                    onChange={(e) => setSystemTagline(e.target.value)}
                    placeholder="e.g. Sustainable Mineral Exploitation and Regional Growth"
                    disabled={!canManageBranding}
                  />
                </div>

                <div className="space-y-1.5 pt-2">
                  <LogoUploadField
                    label="Official Regional Authority Logo"
                    value={logoPrimaryPath}
                    onChange={(val) => setLogoPrimaryPath(val || "")}
                    disabled={!canManageBranding}
                    successMessage="Regional logo uploaded successfully"
                    errorMessage="Failed to upload regional logo"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Upload PNG, JPG, SVG, or WEBP emblem. It represents your regional administration in the sidebar and headers.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/70 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" />
                    Color Palette & Theme Tokens
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Curated color variables applied to buttons, badges, navigation, and accents.
                  </CardDescription>
                </div>
                {canManageBranding && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetToDefault}
                    className="text-xs gap-1"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset Colors
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        disabled={!canManageBranding}
                        className="h-9 w-12 rounded cursor-pointer border"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        disabled={!canManageBranding}
                        className="font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Secondary Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        disabled={!canManageBranding}
                        className="h-9 w-12 rounded cursor-pointer border"
                      />
                      <Input
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        disabled={!canManageBranding}
                        className="font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Accent Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        disabled={!canManageBranding}
                        className="h-9 w-12 rounded cursor-pointer border"
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
                  <div className="pt-4 flex justify-end">
                    <Button type="submit" disabled={isUpdating} className="gap-2">
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Regional Settings
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Live Preview Card */}
        <div>
          <Card className="border border-border/70 shadow-xs sticky top-6">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Live Branding Preview
              </CardTitle>
              <CardDescription className="text-xs">
                How your region appears across navigation headers and components.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sidebar Header Preview */}
              <div className="rounded-xl border p-4 bg-card text-center space-y-2">
                {resolvedLogoUrl ? (
                  <div className="relative h-16 w-16 mx-auto rounded-xl overflow-hidden border p-1 bg-background">
                    <Image
                      src={resolvedLogoUrl}
                      alt="Logo preview"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div
                    className="h-16 w-16 mx-auto rounded-xl flex items-center justify-center font-bold text-lg text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {systemShortName?.slice(0, 3) || "REG"}
                  </div>
                )}
                <div>
                  <div className="font-bold text-sm text-foreground">
                    {systemShortName || "Regional PMS"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {systemTagline || systemFullName || "Regional Administration"}
                  </div>
                </div>
              </div>

              {/* Theme Elements Preview */}
              <div className="space-y-2 pt-2">
                <div className="text-xs font-medium text-muted-foreground">Component Accent Preview</div>
                <div className="flex gap-2">
                  <div
                    className="flex-1 py-2 px-3 rounded-md text-xs font-semibold text-center text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Primary
                  </div>
                  <div
                    className="flex-1 py-2 px-3 rounded-md text-xs font-semibold text-center text-white"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    Secondary
                  </div>
                  <div
                    className="flex-1 py-2 px-3 rounded-md text-xs font-semibold text-center text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    Accent
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
