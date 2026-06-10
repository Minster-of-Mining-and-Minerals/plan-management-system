"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_BRANDING, BRANDING_COLOR_FIELDS } from "@/lib/branding/defaults";
import { applyBrandingTheme, resolveBrandingAssetUrl } from "@/lib/branding/applyBrandingTheme";
import {
  useGetBrandingSettingsQuery,
  useRestoreDefaultBrandingMutation,
  useUpdateBrandingSettingsMutation,
} from "@/redux/api/brandingApi";
import { useUploadAttachmentsMutation } from "@/redux/api/attachementApi";
import {
  type BrandingSettings,
  toUpdateBrandingPayload,
} from "@/redux/types/branding";
import { BrandingPreview } from "./BrandingPreview";

type BrandingTab = "identity" | "logos" | "theme";

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
  const { data: saved, isLoading } = useGetBrandingSettingsQuery();
  const [updateBranding, { isLoading: isSaving }] = useUpdateBrandingSettingsMutation();
  const [restoreDefaults, { isLoading: isRestoring }] = useRestoreDefaultBrandingMutation();

  const [draft, setDraft] = useState<BrandingSettings | null>(null);
  const [activeTab, setActiveTab] = useState<BrandingTab>("identity");

  const form = draft ?? saved ?? DEFAULT_BRANDING;

  const setField = <K extends keyof BrandingSettings>(key: K, value: BrandingSettings[K]) => {
    setDraft((prev) => ({ ...(prev ?? saved ?? DEFAULT_BRANDING), [key]: value }));
  };

  const handleSave = async () => {
    try {
      const result = await updateBranding(toUpdateBrandingPayload(form)).unwrap();
      applyBrandingTheme(result, result.css_variables);
      setDraft(null);
      actionFeedback.success("Branding settings saved");
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error.data?.message || "Failed to save branding settings");
    }
  };

  const handleRestore = async () => {
    if (!(await actionFeedback.confirm("Restore all branding settings to system defaults?", { destructive: true }))) return;
    try {
      const result = await restoreDefaults().unwrap();
      applyBrandingTheme(result, result.css_variables);
      setDraft(null);
      actionFeedback.success("Default branding restored");
    } catch {
      actionFeedback.error("Failed to restore defaults");
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
          <h1 className="text-2xl font-semibold text-[#073954]">Branding Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure system identity, logos, and theme colors. Preview updates live on the right.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleRestore}
            disabled={isRestoring || isSaving}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Restore Defaults
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* Left: configuration */}
        <div className="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
          <BrandingSectionTabs activeTab={activeTab} onTabChange={setActiveTab} />

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
                  Colors are applied platform-wide via CSS variables after saving.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 px-0 sm:grid-cols-2">
                {BRANDING_COLOR_FIELDS.map(({ key, label }) => (
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
              </CardContent>
            </Card>
          )}

        </div>

        {/* Right: always-visible live preview */}
        <div className="lg:sticky lg:top-4 rounded-lg border bg-white p-6 shadow-sm">
          <BrandingPreview branding={form} />
        </div>
      </div>
    </div>
  );
}
