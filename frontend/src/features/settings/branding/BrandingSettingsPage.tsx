"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Building2,
  Globe,
  ImageIcon,
  Loader2,
  Palette,
  RotateCcw,
  Save,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { actionFeedback } from "@/components/action-feedback";
import { TableTabBar } from "@/components/common/TableTabBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_BRANDING, BRANDING_COLOR_FIELD_GROUPS } from "@/lib/branding/defaults";
import { applyBrandingTheme, resolveBrandingAssetUrl } from "@/lib/branding/applyBrandingTheme";
import { useStructureScope } from "@/hooks/useStructureScope";
import {
  useDeleteSectorBrandingMutation,
  useGetBrandingSettingsQuery,
  useRestoreDefaultBrandingMutation,
  useUpdateBrandingSettingsMutation,
} from "@/redux/api/brandingApi";
import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";
import { useUploadAttachmentsMutation } from "@/redux/api/attachementApi";
import {
  type BrandingScopeQuery,
  type BrandingSettings,
  toUpdateBrandingPayload,
} from "@/redux/types/branding";
import { BrandingPreview } from "./BrandingPreview";

type BrandingTab = "identity" | "logos" | "theme";
type BrandingEditScope = "global" | "sector";

const TAB_OPTIONS: {
  key: BrandingTab;
  label: string;
  icon: typeof Type;
}[] = [
  { key: "identity", label: "System Identity", icon: Type },
  { key: "logos", label: "Logos", icon: ImageIcon },
  { key: "theme", label: "Theme Colors", icon: Palette },
];

type LogoFieldProps = {
  label: string;
  value?: string | null;
  onChange: (value: string | null) => void;
};

function LogoUploadField({ label, value, onChange }: LogoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadAttachments, { isLoading }] = useUploadAttachmentsMutation();
  const previewUrl = resolveBrandingAssetUrl(value);

  const handleUpload = async (file: File) => {
    try {
      const result = await uploadAttachments({ files: [file] }).unwrap();
      const path = result.attachments?.[0]?.file_path;
      if (!path) throw new Error("Upload failed");
      onChange(path);
      actionFeedback.success(`${label} uploaded`);
    } catch {
      actionFeedback.error(`Failed to upload ${label.toLowerCase()}`);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <Label>{label}</Label>
      {previewUrl ? (
        <div className="relative flex h-28 items-center justify-center rounded-md border bg-muted/30 p-2">
          <Image
            src={previewUrl}
            alt={label}
            width={160}
            height={80}
            className="max-h-24 w-auto object-contain"
            unoptimized
          />
        </div>
      ) : (
        <div className="flex h-28 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          No logo selected
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.ico"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLoading}
          onClick={() => inputRef.current?.click()}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Upload
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

function BrandingSectionTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: BrandingTab;
  onTabChange: (tab: BrandingTab) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {TAB_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = option.key === activeTab;
        return (
          <Button
            key={option.key}
            type="button"
            size="sm"
            variant={active ? "default" : "outline"}
            onClick={() => onTabChange(option.key)}
            className="flex items-center space-x-2"
          >
            <Icon className="h-4 w-4" />
            <span>{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

export default function BrandingSettingsPage() {
  const { isSuperAdmin, structureId } = useStructureScope();
  const [editScope, setEditScope] = useState<BrandingEditScope>(
    isSuperAdmin ? "global" : "sector"
  );
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(structureId);
  const [draft, setDraft] = useState<BrandingSettings | null>(null);
  const [activeTab, setActiveTab] = useState<BrandingTab>("identity");

  const targetStructureId = useMemo(() => {
    if (isSuperAdmin) {
      return editScope === "global" ? undefined : selectedSectorId ?? undefined;
    }
    return structureId ?? undefined;
  }, [isSuperAdmin, editScope, selectedSectorId, structureId]);

  const settingsQueryArg = useMemo<BrandingScopeQuery | void>(() => {
    if (targetStructureId) {
      return { government_structure_id: targetStructureId };
    }
    return undefined;
  }, [targetStructureId]);

  const { data: saved, isLoading, isFetching } = useGetBrandingSettingsQuery(settingsQueryArg);
  const { data: sectors = [] } = useGetGovernmentStructuresQuery(
    { is_active: true },
    { skip: !isSuperAdmin || editScope !== "sector" }
  );

  const [updateBranding, { isLoading: isSaving }] = useUpdateBrandingSettingsMutation();
  const [restoreDefaults, { isLoading: isRestoring }] = useRestoreDefaultBrandingMutation();
  const [deleteSectorBranding, { isLoading: isDeletingSector }] =
    useDeleteSectorBrandingMutation();

  const meta = saved?.meta;
  const hasSectorOverride = Boolean(meta?.override);
  const isUsingDefault = meta?.is_using_default ?? editScope === "global";
  const canEditSector = editScope === "global" || Boolean(targetStructureId);
  const isBusy = isSaving || isRestoring || isDeletingSector;

  const form = draft ?? saved ?? DEFAULT_BRANDING;

  useEffect(() => {
    setDraft(null);
  }, [editScope, targetStructureId]);

  useEffect(() => {
    if (!isSuperAdmin && structureId) {
      setSelectedSectorId(structureId);
      setEditScope("sector");
    }
  }, [isSuperAdmin, structureId]);

  const setField = <K extends keyof BrandingSettings>(key: K, value: BrandingSettings[K]) => {
    setDraft((prev) => ({ ...(prev ?? saved ?? DEFAULT_BRANDING), [key]: value }));
  };

  const handleSave = async () => {
    if (!canEditSector) {
      actionFeedback.error("Select a sector before saving sector branding.");
      return;
    }

    try {
      const government_structure_id =
        isSuperAdmin && editScope === "global" ? null : targetStructureId ?? null;

      const result = await updateBranding({
        ...toUpdateBrandingPayload(form),
        government_structure_id,
      }).unwrap();

      applyBrandingTheme(result, result.css_variables);
      setDraft(null);
      actionFeedback.success(
        editScope === "global"
          ? "System default branding saved"
          : "Sector branding saved"
      );
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error.data?.message || "Failed to save branding settings");
    }
  };

  const handleRestoreGlobalDefaults = async () => {
    if (
      !(await actionFeedback.confirm(
        "Restore system default branding to factory values? Sector overrides are not affected.",
        { destructive: true }
      ))
    ) {
      return;
    }

    try {
      const result = await restoreDefaults().unwrap();
      applyBrandingTheme(result, result.css_variables);
      setDraft(null);
      actionFeedback.success("System default branding restored");
    } catch {
      actionFeedback.error("Failed to restore system defaults");
    }
  };

  const handleResetSectorToDefault = async () => {
    if (!targetStructureId) return;

    if (
      !(await actionFeedback.confirm(
        "Remove this sector's branding override and use inherited defaults?",
        { destructive: true }
      ))
    ) {
      return;
    }

    try {
      const result = await deleteSectorBranding(targetStructureId).unwrap();
      applyBrandingTheme(result, result.css_variables);
      setDraft(null);
      actionFeedback.success("Sector branding reset to inherited defaults");
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error.data?.message || "Failed to reset sector branding");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Branding Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure system identity, logos, and theme colors. Preview updates live on the right.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isSuperAdmin && editScope === "global" ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleRestoreGlobalDefaults}
              disabled={isBusy}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore Factory Defaults
            </Button>
          ) : null}
          {editScope === "sector" && hasSectorOverride && targetStructureId ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleResetSectorToDefault}
              disabled={isBusy}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Reset to Inherited Default
            </Button>
          ) : null}
          <Button type="button" onClick={handleSave} disabled={isBusy || !canEditSector}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {isSuperAdmin ? (
        <div className="space-y-3">
          <TableTabBar
            tabs={[
              { value: "global", label: "System Default", icon: <Globe className="h-4 w-4" /> },
              {
                value: "sector",
                label: "Sector Branding",
                icon: <Building2 className="h-4 w-4" />,
              },
            ]}
            value={editScope}
            onChange={(value) => setEditScope(value as BrandingEditScope)}
          />
          {editScope === "sector" ? (
            <div className="max-w-md space-y-2">
              <Label htmlFor="branding-sector-select">Sector</Label>
              <Select
                value={selectedSectorId ?? ""}
                onValueChange={(value) => setSelectedSectorId(value)}
              >
                <SelectTrigger id="branding-sector-select">
                  <SelectValue placeholder="Select a sector" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((sector) => (
                    <SelectItem
                      key={sector.government_structure_id}
                      value={sector.government_structure_id}
                    >
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className={`rounded-lg border px-4 py-3 text-sm ${
          editScope === "global"
            ? "border-primary/20 bg-primary/5 text-primary"
            : isUsingDefault
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
        }`}
      >
        {editScope === "global" ? (
          <p>
            Editing the <strong>system default</strong>. Sectors without their own branding use
            these settings.
          </p>
        ) : !targetStructureId ? (
          <p>Select a sector to configure its branding.</p>
        ) : isUsingDefault ? (
          <p>
            This sector currently uses <strong>inherited branding</strong>
            {meta?.resolved_from_structure_id &&
            meta.resolved_from_structure_id !== targetStructureId
              ? " from a parent sector"
              : " from the system default"}
            . Save changes to create a sector-specific override.
          </p>
        ) : (
          <p>
            <strong>Custom sector branding</strong> is active. Other sectors are not affected.
          </p>
        )}
      </div>

      {isFetching ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Refreshing branding…
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* Left: configuration */}
        <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <BrandingSectionTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <fieldset disabled={!canEditSector || isBusy} className="space-y-4 disabled:opacity-60">
          {activeTab === "identity" && (
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0 pt-4">
                <CardTitle>System Name</CardTitle>
                <CardDescription>
                  Names displayed in the sidebar, login page, and browser title.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 px-0">
                <div className="space-y-2">
                  <Label htmlFor="system_name_full">Full System Name</Label>
                  <Input
                    id="system_name_full"
                    value={form.system_name_full}
                    onChange={(e) => setField("system_name_full", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="system_name_short">Short Name / Abbreviation</Label>
                  <Input
                    id="system_name_short"
                    value={form.system_name_short}
                    onChange={(e) => setField("system_name_short", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="system_tagline">Tagline (optional)</Label>
                  <Input
                    id="system_tagline"
                    value={form.system_tagline ?? ""}
                    onChange={(e) => setField("system_tagline", e.target.value || null)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "logos" && (
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0 pt-4">
                <CardTitle>Logo Management</CardTitle>
                <CardDescription>
                  Upload or replace logos. The preview panel reflects changes immediately.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 px-0">
                <LogoUploadField
                  label="Primary Logo"
                  value={form.logo_primary_path}
                  onChange={(v) => setField("logo_primary_path", v)}
                />
                <LogoUploadField
                  label="Secondary Logo (optional)"
                  value={form.logo_secondary_path}
                  onChange={(v) => setField("logo_secondary_path", v)}
                />
                <LogoUploadField
                  label="Favicon"
                  value={form.favicon_path}
                  onChange={(v) => setField("favicon_path", v)}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === "theme" && (
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0 pt-4">
                <CardTitle>Theme Configuration</CardTitle>
                <CardDescription>
                  Core theme, sidebar navigation, and toolbar/table colors are applied platform-wide
                  via CSS variables after saving.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 px-0">
                {BRANDING_COLOR_FIELD_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-4">
                    <h3 className="text-sm font-semibold text-primary">{group.title}</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {group.fields.map(({ key, label }) => (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={key}>{label}</Label>
                          <div className="flex items-center gap-2">
                            <input
                              id={key}
                              type="color"
                              value={form[key]}
                              onChange={(e) => setField(key, e.target.value)}
                              className="h-10 w-12 cursor-pointer rounded border"
                            />
                            <Input
                              value={form[key]}
                              onChange={(e) => setField(key, e.target.value)}
                              className="font-mono text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          </fieldset>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm lg:sticky lg:top-4">
          <BrandingPreview branding={form} />
        </div>
      </div>
    </div>
  );
}
