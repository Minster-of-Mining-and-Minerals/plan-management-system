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

interface BrandingFormState {
  system_name: string;
  system_name_am: string;
  tagline: string;
  logo_url: string;
  logo_login_url: string;
  theme: BrandingThemeTokens;
  is_active: boolean;
}

const defaultForm: BrandingFormState = {
  system_name: "",
  system_name_am: "",
  tagline: "",
  logo_url: PLATFORM_LOGO_URL,
  logo_login_url: PLATFORM_LOGO_URL,
  theme: { ...DEFAULT_BRANDING_THEME },
  is_active: false,
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
      logo_url: form.logo_url,
      logo_login_url: form.logo_login_url,
      theme_json: form.theme,
      is_active: form.is_active,
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
                  <div className="space-y-2">
                    <Label>Logo URL (sidebar / header / compact)</Label>
                    <Input
                      value={form.logo_url}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, logo_url: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Login / hero logo URL</Label>
                    <Input
                      value={form.logo_login_url}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, logo_login_url: e.target.value }))
                      }
                    />
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
                src={form.logo_url}
                alt="Logo preview"
                width={80}
                height={80}
                className="object-contain"
                unoptimized={form.logo_url.startsWith("http")}
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
