"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCreateBrandingMutation,
  useGetBrandingByIdQuery,
  useUpdateBrandingMutation,
} from "@/redux/api/brandingApi";
import { applyBrandingTheme } from "@/utils/applyBrandingTheme";
import type { SystemBranding } from "@/redux/types/branding";
import {
  DEFAULT_BRANDING_THEME,
  themeFromBrandingRecord,
  type BrandingThemeTokens,
} from "@/config/brandingTheme";
import { PLATFORM_LOGO_URL } from "@/config/platformBranding";
import { BrandingThemeSection } from "./BrandingThemeSection";
import { FileUploadField } from "@/components/common/FileUploadField";
import { getBrandingAssetUrl, toStoredFilePath } from "@/utils/fileUrl";

interface BrandingFormState {
  system_name: string;
  system_name_am: string;
  tagline: string;
  logo_url: string;
  logo_login_url: string;
  theme: BrandingThemeTokens;
  is_active: boolean;
  organization_address: string;
  organization_city: string;
  organization_region: string;
  organization_country: string;
  organization_branch: string;
  contact_phone: string;
  contact_email: string;
  license_info: string;
  prescription_signature_file: string;
}

const defaultForm: BrandingFormState = {
  system_name: "",
  system_name_am: "",
  tagline: "",
  logo_url: PLATFORM_LOGO_URL,
  logo_login_url: PLATFORM_LOGO_URL,
  theme: { ...DEFAULT_BRANDING_THEME },
  is_active: false,
  organization_address: "",
  organization_city: "",
  organization_region: "",
  organization_country: "",
  organization_branch: "",
  contact_phone: "",
  contact_email: "",
  license_info: "",
  prescription_signature_file: "",
};

export default function CreateBranding({ brandingId }: { brandingId?: string }) {
  const { id: paramId } = useParams<{ id?: string }>();
  const router = useRouter();
  const id = brandingId || paramId;
  const isEditMode = Boolean(id && id !== "new");

  const [form, setForm] = useState<BrandingFormState>(defaultForm);

  const { data: brandingData, isLoading: loadingBranding } = useGetBrandingByIdQuery(
    id!,
    { skip: !isEditMode }
  );
  const [createBranding, { isLoading: creating }] = useCreateBrandingMutation();
  const [updateBranding, { isLoading: updating }] = useUpdateBrandingMutation();

  useEffect(() => {
    if (isEditMode && brandingData) {
      setForm({
        system_name: brandingData.system_name,
        system_name_am: brandingData.system_name_am || "",
        tagline: brandingData.tagline || "",
        logo_url: brandingData.logo_url,
        logo_login_url: brandingData.logo_login_url,
        theme: themeFromBrandingRecord(brandingData),
        is_active: brandingData.is_active,
        organization_address: brandingData.organization_address || "",
        organization_city: brandingData.organization_city || "",
        organization_region: brandingData.organization_region || "",
        organization_country: brandingData.organization_country || "",
        organization_branch: brandingData.organization_branch || "",
        contact_phone: brandingData.contact_phone || "",
        contact_email: brandingData.contact_email || "",
        license_info: brandingData.license_info || "",
        prescription_signature_file: brandingData.prescription_signature_file || "",
      });
    }
  }, [isEditMode, brandingData]);

  const preview: SystemBranding = {
    branding_id: "preview",
    system_name: form.system_name,
    system_name_am: form.system_name_am || null,
    tagline: form.tagline || null,
    logo_url: form.logo_url,
    logo_login_url: form.logo_login_url,
    theme_json: form.theme,
    primary_hsl: form.theme.primary,
    accent_hsl: form.theme["section-accent"],
    sidebar_hover_hsl: form.theme["sidebar-hover"],
    accent_hover_hsl: form.theme["section-accent-hover"],
    is_active: form.is_active,
  };

  useEffect(() => {
    applyBrandingTheme(preview);
  }, [form]);

  const handleThemeChange = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      theme: { ...prev.theme, [key]: value },
    }));
  };

  const handleSubmit = async () => {
    if (!form.system_name.trim()) {
      toast.error("System name is required");
      return;
    }

    const payload = {
      system_name: form.system_name,
      system_name_am: form.system_name_am || undefined,
      tagline: form.tagline || undefined,
      logo_url: form.logo_url || PLATFORM_LOGO_URL,
      logo_login_url: form.logo_login_url || PLATFORM_LOGO_URL,
      theme_json: form.theme,
      is_active: form.is_active,
      organization_address: form.organization_address || undefined,
      organization_city: form.organization_city || undefined,
      organization_region: form.organization_region || undefined,
      organization_country: form.organization_country || undefined,
      organization_branch: form.organization_branch || undefined,
      contact_phone: form.contact_phone || undefined,
      contact_email: form.contact_email || undefined,
      license_info: form.license_info || undefined,
      prescription_signature_file: toStoredFilePath(form.prescription_signature_file) || null,
    };

    try {
      if (isEditMode && id) {
        await updateBranding({ id, data: payload }).unwrap();
        toast.success("Branding updated");
      } else {
        await createBranding(payload).unwrap();
        toast.success("Branding created");
      }
      router.push("/branding");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? (err as { data?: { message?: string } }).data?.message
          : undefined;
      toast.error(message || "Failed to save branding");
    }
  };

  if (isEditMode && loadingBranding) {
    return <div className="p-6 text-muted-foreground">Loading branding...</div>;
  }

  const signaturePreviewUrl = form.prescription_signature_file
    ? getBrandingAssetUrl(form.prescription_signature_file)
    : null;
  const sidebarLogoPreview = getBrandingAssetUrl(form.logo_url);
  const loginLogoPreview = getBrandingAssetUrl(form.logo_login_url);

  const resetToDefaultLogos = () => {
    setForm((prev) => ({
      ...prev,
      logo_url: PLATFORM_LOGO_URL,
      logo_login_url: PLATFORM_LOGO_URL,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            {isEditMode ? "Edit Branding" : "New Branding"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure system identity and theme colors used across public and admin pages.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/branding")}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={creating || updating}>
            {isEditMode ? "Save Changes" : "Create Branding"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="system-info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="system-info">System Info</TabsTrigger>
              <TabsTrigger value="colors">Colors</TabsTrigger>
            </TabsList>

            <TabsContent value="system-info" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Info</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Name, tagline, logos, and activation status.
                  </p>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>System Name (English)</Label>
                    <Input
                      value={form.system_name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, system_name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>System Name (Amharic)</Label>
                    <Input
                      value={form.system_name_am}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, system_name_am: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Tagline</Label>
                    <Input
                      value={form.tagline}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, tagline: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-primary font-semibold">
                      Organization / hospital location
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Used on printed prescriptions and official documents.
                    </p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Address</Label>
                    <Input
                      value={form.organization_address}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          organization_address: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={form.organization_city}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, organization_city: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Region</Label>
                    <Input
                      value={form.organization_region}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          organization_region: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      value={form.organization_country}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          organization_country: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <Input
                      value={form.organization_branch}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          organization_branch: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact phone</Label>
                    <Input
                      value={form.contact_phone}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, contact_phone: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact email</Label>
                    <Input
                      value={form.contact_email}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, contact_email: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>License / registration info</Label>
                    <Input
                      value={form.license_info}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, license_info: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-primary font-semibold">
                      Prescription signature
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Organization signature used when a prescription template has
                      &quot;Template signature&quot; enabled. Upload a PNG or JPG of the
                      authorized signatory or hospital stamp.
                    </p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <FileUploadField
                      id="branding_prescription_signature"
                      label="Signature image"
                      value={form.prescription_signature_file}
                      multiple={false}
                      valueFormat="fileUrls"
                      accept="image/*"
                      onChange={(v) => {
                        const next =
                          typeof v === "string"
                            ? v
                            : Array.isArray(v)
                              ? v[0] || ""
                              : "";
                        setForm((prev) => ({
                          ...prev,
                          prescription_signature_file: toStoredFilePath(next),
                        }));
                      }}
                    />
                    {signaturePreviewUrl && (
                      <div className="rounded-md border bg-muted/30 p-3">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          Signature preview
                        </p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={signaturePreviewUrl}
                          alt="Prescription signature preview"
                          className="max-h-24 object-contain"
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-primary font-semibold">Logos</Label>
                    <p className="text-xs text-muted-foreground">
                      Defaults to the platform logo. Upload custom images for the
                      sidebar, login page, and printed prescriptions (uses the
                      sidebar logo).
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={resetToDefaultLogos}
                    >
                      Reset to default platform logo
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <FileUploadField
                      id="branding_logo_sidebar"
                      label="Sidebar / header / prescription logo"
                      value={form.logo_url}
                      multiple={false}
                      valueFormat="fileUrls"
                      accept="image/*"
                      onChange={(v) => {
                        const next =
                          typeof v === "string"
                            ? v
                            : Array.isArray(v)
                              ? v[0] || ""
                              : "";
                        setForm((prev) => ({
                          ...prev,
                          logo_url: next
                            ? toStoredFilePath(next)
                            : PLATFORM_LOGO_URL,
                        }));
                      }}
                    />
                    {sidebarLogoPreview && (
                      <div className="rounded-md border bg-muted/30 p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={sidebarLogoPreview}
                          alt="Sidebar logo preview"
                          className="mx-auto max-h-16 object-contain"
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <FileUploadField
                      id="branding_logo_login"
                      label="Login / hero logo"
                      value={form.logo_login_url}
                      multiple={false}
                      valueFormat="fileUrls"
                      accept="image/*"
                      onChange={(v) => {
                        const next =
                          typeof v === "string"
                            ? v
                            : Array.isArray(v)
                              ? v[0] || ""
                              : "";
                        setForm((prev) => ({
                          ...prev,
                          logo_login_url: next
                            ? toStoredFilePath(next)
                            : PLATFORM_LOGO_URL,
                        }));
                      }}
                    />
                    {loginLogoPreview && (
                      <div className="rounded-md border bg-muted/30 p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={loginLogoPreview}
                          alt="Login logo preview"
                          className="mx-auto max-h-20 object-contain"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 md:col-span-2">
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({ ...prev, is_active: checked }))
                      }
                    />
                    <Label>Set as active branding (applies site-wide)</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="colors" className="mt-4">
              <BrandingThemeSection theme={form.theme} onThemeChange={handleThemeChange} />
            </TabsContent>
          </Tabs>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-4">
              <Image
                src={sidebarLogoPreview}
                alt="Logo preview"
                width={80}
                height={80}
                className="object-contain"
                unoptimized={sidebarLogoPreview.startsWith("http")}
              />
              <p className="text-center text-sm font-semibold text-section-accent">
                {form.system_name || "System Name"}
              </p>
              {form.tagline && (
                <p className="text-center text-xs text-muted-foreground">{form.tagline}</p>
              )}
            </div>
            <Button className="w-full bg-section-accent text-white hover:bg-section-accent-hover">
              Sample Button
            </Button>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-[70%] rounded-full bg-section-accent" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
