"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DetailHeader from "@/components/common/DetailHeader";
import { useGetUserFormConfigQuery } from "@/redux/api/formFieldApi";
import {
  useGetPatientByIdQuery,
  useGetPatientsQuery,
} from "@/redux/api/patientApi";
import {
  useGetPatientSlipConfigQuery,
  useUpdatePatientSlipConfigMutation,
} from "@/redux/api/patientSlipApi";
import type {
  PatientSlipConfig,
  SlipBodyLayout,
  SlipDecorConfig,
  SlipFieldSlot,
  SlipObjectFit,
} from "@/redux/types/patientSlipConfig";
import { flattenFormFields } from "@/redux/types/formField";
import {
  SLIP_DEFAULT_BOTTOM_BAR,
  SLIP_DEFAULT_TOP_BAR,
} from "@/config/patientSlipDefaults";
import { useBranding } from "@/providers/BrandingProvider";
import { PLATFORM_LOGO_URL } from "@/config/platformBranding";
import { SlipImageUploadField } from "./SlipImageUploadField";
import { PatientIdentificationSlip } from "./PatientIdentificationSlip";
import { PatientPreviewSearchCombobox } from "./PatientPreviewSearchCombobox";

function DecorEditor({
  label,
  value,
  defaultImageUrl,
  onChange,
}: {
  label: string;
  value: SlipDecorConfig;
  defaultImageUrl: string;
  onChange: (v: SlipDecorConfig) => void;
}) {
  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <Label className="font-semibold">{label}</Label>
        <Switch
          checked={value.enabled}
          onCheckedChange={(enabled) => onChange({ ...value, enabled })}
        />
      </div>
      <SlipImageUploadField
        label="Bar image"
        value={value.image_url}
        defaultUrl={defaultImageUrl}
        onChange={(image_url) => onChange({ ...value, image_url })}
        previewHeight={40}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-muted-foreground">Height (px)</Label>
          <Input
            type="number"
            min={8}
            max={120}
            value={value.height_px}
            onChange={(e) =>
              onChange({ ...value, height_px: Number(e.target.value) || 32 })
            }
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Object fit</Label>
          <Select
            value={value.object_fit}
            onValueChange={(v) =>
              onChange({ ...value, object_fit: v as SlipObjectFit })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cover">Cover</SelectItem>
              <SelectItem value="contain">Contain</SelectItem>
              <SelectItem value="fill">Fill</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs text-muted-foreground">
            Object position (CSS)
          </Label>
          <Input
            value={value.object_position}
            onChange={(e) =>
              onChange({ ...value, object_position: e.target.value })
            }
            placeholder="center, top, bottom…"
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}

function FieldSlotEditor({
  title,
  slots,
  fieldOptions,
  onChange,
}: {
  title: string;
  slots: SlipFieldSlot[];
  fieldOptions: { key: string; label: string }[];
  onChange: (slots: SlipFieldSlot[]) => void;
}) {
  const updateSlot = (index: number, patch: Partial<SlipFieldSlot>) => {
    const next = [...slots];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeSlot = (index: number) => {
    onChange(slots.filter((_, i) => i !== index));
  };

  const addSlot = () => {
    onChange([
      ...slots,
      {
        id: crypto.randomUUID(),
        label_am: "",
        label_en: "New field",
        field_key: "@full_name",
        enabled: true,
      },
    ]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-primary">{title}</h4>
        <Button type="button" variant="outline" size="sm" onClick={addSlot}>
          <Plus className="h-4 w-4 mr-1" />
          Add row
        </Button>
      </div>
      <div className="space-y-2">
        {slots.map((slot, index) => (
          <div
            key={slot.id}
            className="grid gap-2 rounded-md border p-3 sm:grid-cols-12 sm:items-end"
          >
            <div className="sm:col-span-1 flex items-center pb-2">
              <Switch
                checked={slot.enabled}
                onCheckedChange={(enabled) => updateSlot(index, { enabled })}
              />
            </div>
            <div className="sm:col-span-3">
              <Label className="text-xs">Amharic label</Label>
              <Input
                value={slot.label_am}
                onChange={(e) => updateSlot(index, { label_am: e.target.value })}
                className="mt-1 h-8"
              />
            </div>
            <div className="sm:col-span-3">
              <Label className="text-xs">English label</Label>
              <Input
                value={slot.label_en}
                onChange={(e) => updateSlot(index, { label_en: e.target.value })}
                className="mt-1 h-8"
              />
            </div>
            <div className="sm:col-span-4">
              <Label className="text-xs">Patient data field</Label>
              <Select
                value={slot.field_key}
                onValueChange={(field_key) => updateSlot(index, { field_key })}
              >
                <SelectTrigger className="mt-1 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldOptions.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-1 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeSlot(index)}
                aria-label="Remove row"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PatientSlipConfigPage() {
  const { data, isLoading } = useGetPatientSlipConfigQuery();
  const { data: formConfig } = useGetUserFormConfigQuery();
  const { branding } = useBranding();
  const [updateConfig, { isLoading: saving }] =
    useUpdatePatientSlipConfigMutation();

  const [config, setConfig] = useState<PatientSlipConfig | null>(null);
  const [previewPatientId, setPreviewPatientId] = useState<string>("");
  const [patientSearch, setPatientSearch] = useState("");

  const { data: patients = [], isLoading: patientsLoading } = useGetPatientsQuery(
    patientSearch.trim() ? { search: patientSearch.trim() } : undefined
  );

  const { data: previewPatientById } = useGetPatientByIdQuery(previewPatientId, {
    skip: !previewPatientId,
  });

  useEffect(() => {
    if (data?.slip_config) setConfig(JSON.parse(JSON.stringify(data.slip_config)));
  }, [data]);

  useEffect(() => {
    if (!previewPatientId && patients[0]?.user_id) {
      setPreviewPatientId(patients[0].user_id);
    }
  }, [patients, previewPatientId]);

  const fieldOptions = useMemo(() => {
    const reserved =
      data?.reserved_field_keys?.map((r) => ({
        key: r.key,
        label: r.label,
      })) ?? [];
    const form = flattenFormFields(formConfig).map((f) => ({
      key: f.field_key,
      label: `${f.label} (${f.field_key})`,
    }));
    const seen = new Set<string>();
    const merged: { key: string; label: string }[] = [];
    for (const opt of [...reserved, ...form]) {
      if (seen.has(opt.key)) continue;
      seen.add(opt.key);
      merged.push(opt);
    }
    return merged;
  }, [data, formConfig]);

  const previewPatient =
    previewPatientById ??
    patients.find((p) => p.user_id === previewPatientId) ??
    null;

  const defaultLogoUrl = branding.logo_url || PLATFORM_LOGO_URL;

  const handleSave = async () => {
    if (!config) return;
    try {
      await updateConfig(config).unwrap();
      toast.success("Slip configuration saved");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Failed to save";
      toast.error(message);
    }
  };

  const handleResetDefaults = () => {
    if (data?.defaults) {
      setConfig(JSON.parse(JSON.stringify(data.defaults)));
      toast.message("Restored default layout (save to apply)");
    }
  };

  if (isLoading || !config) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <DetailHeader
          breadcrumbs={[
            { title: "Patients", link: "/patients/list" },
            { title: "Identification slip" },
          ]}
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleResetDefaults}>
            Reset defaults
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : "Save configuration"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Header (logo & name)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Use active branding logo</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Default: hospital logo from branding settings
                  </p>
                </div>
                <Switch
                  checked={config.header.use_branding_logo}
                  onCheckedChange={(use_branding_logo) =>
                    setConfig({
                      ...config,
                      header: {
                        ...config.header,
                        use_branding_logo,
                        logo_url: use_branding_logo ? null : config.header.logo_url,
                      },
                    })
                  }
                />
              </div>
              {!config.header.use_branding_logo && (
                <SlipImageUploadField
                  label="Custom slip logo"
                  value={config.header.logo_url ?? ""}
                  defaultUrl={defaultLogoUrl}
                  onChange={(logo_url) =>
                    setConfig({
                      ...config,
                      header: { ...config.header, logo_url },
                    })
                  }
                  previewHeight={72}
                />
              )}
              {config.header.use_branding_logo && (
                <div className="rounded-md border p-3 bg-muted/20">
                  <p className="text-xs text-muted-foreground mb-2">
                    Current branding logo (default)
                  </p>
                  <img
                    src={defaultLogoUrl}
                    alt="Branding logo"
                    className="h-16 w-16 object-contain mx-auto"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Logo width (px)</Label>
                  <Input
                    type="number"
                    value={config.header.logo_width_px}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        header: {
                          ...config.header,
                          logo_width_px: Number(e.target.value) || 72,
                        },
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Logo height (px)</Label>
                  <Input
                    type="number"
                    value={config.header.logo_height_px}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        header: {
                          ...config.header,
                          logo_height_px: Number(e.target.value) || 72,
                        },
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <Label>Use active branding title</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Default: {branding.system_name_am} / {branding.system_name}
                  </p>
                </div>
                <Switch
                  checked={config.header.use_branding_title}
                  onCheckedChange={(use_branding_title) =>
                    setConfig({
                      ...config,
                      header: { ...config.header, use_branding_title },
                    })
                  }
                />
              </div>
              {!config.header.use_branding_title && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Title (Amharic)</Label>
                    <Input
                      value={config.header.title_am ?? ""}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          header: {
                            ...config.header,
                            title_am: e.target.value || null,
                          },
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Title (English)</Label>
                    <Input
                      value={config.header.title_en ?? ""}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          header: {
                            ...config.header,
                            title_en: e.target.value || null,
                          },
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top & bottom images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Defaults use{" "}
                <code className="text-[10px]">{SLIP_DEFAULT_TOP_BAR}</code> and{" "}
                <code className="text-[10px]">{SLIP_DEFAULT_BOTTOM_BAR}</code>.
                Upload a replacement or paste a URL.
              </p>
              <DecorEditor
                label="Top decorative bar"
                value={config.decor.top}
                defaultImageUrl={SLIP_DEFAULT_TOP_BAR}
                onChange={(top) =>
                  setConfig({ ...config, decor: { ...config.decor, top } })
                }
              />
              <DecorEditor
                label="Bottom decorative bar"
                value={config.decor.bottom}
                defaultImageUrl={SLIP_DEFAULT_BOTTOM_BAR}
                onChange={(bottom) =>
                  setConfig({
                    ...config,
                    decor: { ...config.decor, bottom },
                  })
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Barcode source</CardTitle>
            </CardHeader>
            <CardContent>
              <Label className="text-xs text-muted-foreground">
                Field used for barcode value
              </Label>
              <Select
                value={config.barcode_field_key || "@barcode"}
                onValueChange={(barcode_field_key) =>
                  setConfig({ ...config, barcode_field_key })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldOptions.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Slip fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Body layout</Label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  Columns show fields side by side. Rows stack the first block on
                  top and the second below with a divider; each field spans the
                  full slip width.
                </p>
                <Select
                  value={config.layout ?? "columns"}
                  onValueChange={(layout) =>
                    setConfig({
                      ...config,
                      layout: layout as SlipBodyLayout,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="columns">Two columns (side by side)</SelectItem>
                    <SelectItem value="rows">Two rows (stacked, full width)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <FieldSlotEditor
                title={
                  config.layout === "rows"
                    ? "Top section (Amharic + English)"
                    : "Left column (Amharic + English)"
                }
                slots={config.left_columns}
                fieldOptions={fieldOptions}
                onChange={(left_columns) =>
                  setConfig({ ...config, left_columns })
                }
              />
              <FieldSlotEditor
                title={
                  config.layout === "rows"
                    ? "Bottom section (English + Amharic)"
                    : "Right column (English + Amharic)"
                }
                slots={config.right_columns}
                fieldOptions={fieldOptions}
                onChange={(right_columns) =>
                  setConfig({ ...config, right_columns })
                }
              />
            </CardContent>
          </Card>
        </div>

        <Card className="xl:sticky xl:top-4 h-fit">
          <CardHeader>
            <CardTitle className="text-base">Live preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Preview patient
              </Label>
              <PatientPreviewSearchCombobox
                patients={patients}
                selectedPatient={previewPatient}
                value={previewPatientId}
                search={patientSearch}
                isLoading={patientsLoading}
                onSearchChange={setPatientSearch}
                onValueChange={setPreviewPatientId}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Preview updates as you edit. Save to apply on all patient detail
              pages.
            </p>
            {previewPatient ? (
              <PatientIdentificationSlip
                patient={previewPatient}
                configOverride={config}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Search and select a patient to preview the slip.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
