"use strict";
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
  useGetCompanyBrandingQuery,
  useUpdateCompanyBrandingMutation,
} from "@/redux/api/companyApi";
import Loading01 from "@/features/template/component/Loading/Loading01";

export function CompanySettingsAndBranding({
  companyId: propCompanyId,
  companyName: propCompanyName,
}: {
  companyId?: string;
  companyName?: string;
}) {
  const { data: session } = useSession();
  const companyId = propCompanyId || session?.user?.company_id;

  const { can } = usePermissions();
  const { roles: userRoles } = useAuth();
  const isSuperAdmin = userRoles?.some((r) => String(r).toLowerCase() === "super admin");

  const canManageBranding =
    can("COMPANY_BRANDING:UPDATE") ||
    can("COMPANY_BRANDING:MANAGE") ||
    can("COMPANIES:MANAGE") ||
    isSuperAdmin;

  const {
    data: brandingData,
    isLoading,
    refetch,
  } = useGetCompanyBrandingQuery(companyId || "", {
    skip: !companyId,
  });

  const [updateBranding, { isLoading: isUpdating }] = useUpdateCompanyBrandingMutation();

  // Form State
  const [systemFullName, setSystemFullName] = useState("");
  const [systemShortName, setSystemShortName] = useState("");
  const [systemTagline, setSystemTagline] = useState("");
  const [logoPrimaryPath, setLogoPrimaryPath] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0f766e");
  const [secondaryColor, setSecondaryColor] = useState("#64748b");
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
      setSecondaryColor(brandingData.secondary_color || "#64748b");
      setAccentColor(brandingData.accent_color || "#f59e0b");
      setSidebarColor(brandingData.sidebar_color || "");
      setHeaderColor(brandingData.header_color || "");
    }
  }, [brandingData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      await updateBranding({
        company_id: companyId,
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

      actionFeedback.success("Company branding settings saved successfully.");
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to update branding settings.");
    }
  };

  const handleResetToDefaults = () => {
    setPrimaryColor("#0f766e");
    setSecondaryColor("#64748b");
    setAccentColor("#f59e0b");
    setSidebarColor("");
    setHeaderColor("");
  };

  const colorPresets = [
    { name: "Teal Mining", primary: "#0f766e", secondary: "#64748b", accent: "#f59e0b" },
    { name: "Emerald Resources", primary: "#059669", secondary: "#475569", accent: "#d97706" },
    { name: "Cobalt Industrial", primary: "#1d4ed8", secondary: "#334155", accent: "#e11d48" },
    { name: "Dark Copper", primary: "#b45309", secondary: "#3f3f46", accent: "#0284c7" },
  ];

  if (isLoading) {
    return <Loading01 />;
  }

  const logoPreview = getFileUrl(logoPrimaryPath);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Company Identity & Appearance</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize company system titles, logo, and brand color palette for this company workspace.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Configuration Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  System Identification
                </CardTitle>
                <CardDescription>
                  Names displayed on navigation headers, dashboard banners, and system reports.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium">Full System Name *</label>
                    <Input
                      required
                      placeholder="e.g. Adola Gold Mining Corporation"
                      value={systemFullName}
                      onChange={(e) => setSystemFullName(e.target.value)}
                      disabled={!canManageBranding}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Short Code / Acronym *</label>
                    <Input
                      required
                      placeholder="e.g. AGMC"
                      value={systemShortName}
                      onChange={(e) => setSystemShortName(e.target.value)}
                      disabled={!canManageBranding}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">System Tagline</label>
                  <Input
                    placeholder="e.g. Sustainable Mineral Exploration & Operational Excellence"
                    value={systemTagline}
                    onChange={(e) => setSystemTagline(e.target.value)}
                    disabled={!canManageBranding}
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-sm font-medium">Company Emblem / Primary Logo</label>
                  <LogoUploadField
                    value={logoPrimaryPath}
                    onChange={(val) => setLogoPrimaryPath(val || "")}
                    label="Upload Company Logo"
                    disabled={!canManageBranding}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Color Palette */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Palette className="w-4 h-4 text-primary" />
                      Brand Theme & Palette
                    </CardTitle>
                    <CardDescription>
                      Primary, secondary, and accent colors for this company's workspace interface.
                    </CardDescription>
                  </div>
                  {canManageBranding && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResetToDefaults}
                      className="text-xs text-muted-foreground"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Reset Colors
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {canManageBranding && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Color Presets:</span>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {colorPresets.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setPrimaryColor(preset.primary);
                            setSecondaryColor(preset.secondary);
                            setAccentColor(preset.accent);
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: preset.primary }}
                          />
                          <span>{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Primary Brand Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        disabled={!canManageBranding}
                        className="w-9 h-9 rounded cursor-pointer border border-border"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        disabled={!canManageBranding}
                        className="font-mono text-xs uppercase"
                        maxLength={7}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Secondary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        disabled={!canManageBranding}
                        className="w-9 h-9 rounded cursor-pointer border border-border"
                      />
                      <Input
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        disabled={!canManageBranding}
                        className="font-mono text-xs uppercase"
                        maxLength={7}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Accent / Highlight</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        disabled={!canManageBranding}
                        className="w-9 h-9 rounded cursor-pointer border border-border"
                      />
                      <Input
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        disabled={!canManageBranding}
                        className="font-mono text-xs uppercase"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Preview Card */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Live Branding Preview
                </CardTitle>
                <CardDescription>
                  Preview how your company header, emblem, and theme will appear in the workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="rounded-xl p-5 border border-border transition-colors shadow-sm"
                  style={{
                    backgroundColor: "#ffffff",
                    borderColor: primaryColor + "33",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center border overflow-hidden relative"
                      style={{
                        backgroundColor: primaryColor + "15",
                        borderColor: primaryColor + "33",
                      }}
                    >
                      {logoPreview ? (
                        <Image
                          src={logoPreview}
                          alt="Logo Preview"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <Building2 className="w-6 h-6" style={{ color: primaryColor }} />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm leading-tight text-slate-900">
                        {systemFullName || "Company System Name"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {systemShortName ? `${systemShortName} Workspace` : "Company Workspace"}
                      </p>
                    </div>
                  </div>

                  {systemTagline && (
                    <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100 italic">
                      &ldquo;{systemTagline}&rdquo;
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white shadow-sm"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Primary Action
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                      style={{
                        borderColor: primaryColor + "44",
                        color: primaryColor,
                        backgroundColor: primaryColor + "08",
                      }}
                    >
                      Secondary
                    </button>
                    <div
                      className="ml-auto w-3 h-3 rounded-full"
                      style={{ backgroundColor: accentColor }}
                      title="Accent"
                    />
                  </div>
                </div>

                {canManageBranding && (
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving Settings...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Branding Settings
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
