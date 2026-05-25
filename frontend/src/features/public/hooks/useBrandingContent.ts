"use client";

import { useBranding } from "@/providers/BrandingProvider";
import {
  PLATFORM_DESCRIPTION,
  PLATFORM_TAGLINE,
} from "@/config/platformBranding";

export function useBrandingContent(locale: "en" | "am" = "en") {
  const { branding, isLoading } = useBranding();

  const displayName =
    locale === "am" && branding.system_name_am
      ? branding.system_name_am
      : branding.system_name;

  return {
    isLoading,
    name: branding.system_name,
    displayName,
    nameAm: branding.system_name_am,
    tagline: branding.tagline?.trim() || PLATFORM_TAGLINE,
    description: PLATFORM_DESCRIPTION,
    logoUrl: branding.logo_url,
    logoLoginUrl: branding.logo_login_url,
  };
}
