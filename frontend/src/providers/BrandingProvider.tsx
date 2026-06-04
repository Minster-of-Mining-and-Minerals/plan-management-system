"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { DEFAULT_BRANDING } from "@/lib/branding/defaults";
import {
  applyBrandingDocumentMeta,
  applyBrandingTheme,
  resolveBrandingAssetUrl,
} from "@/lib/branding/applyBrandingTheme";
import { useGetPublicBrandingQuery } from "@/redux/api/brandingApi";
import type { BrandingSettings } from "@/redux/types/branding";

type BrandingContextValue = {
  branding: BrandingSettings;
  isLoading: boolean;
  logoPrimaryUrl: string;
  logoSecondaryUrl: string;
  faviconUrl: string;
};

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  isLoading: true,
  logoPrimaryUrl: DEFAULT_BRANDING.logo_primary_path ?? "",
  logoSecondaryUrl: DEFAULT_BRANDING.logo_secondary_path ?? "",
  faviconUrl: DEFAULT_BRANDING.favicon_path ?? "",
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, isFetching } = useGetPublicBrandingQuery();

  const branding = data ?? DEFAULT_BRANDING;

  useEffect(() => {
    if (!data) return;
    applyBrandingTheme(data, data.css_variables);
    applyBrandingDocumentMeta(data);
  }, [data]);

  const value = useMemo<BrandingContextValue>(
    () => ({
      branding,
      isLoading: isLoading || isFetching,
      logoPrimaryUrl: resolveBrandingAssetUrl(branding.logo_primary_path),
      logoSecondaryUrl: resolveBrandingAssetUrl(branding.logo_secondary_path),
      faviconUrl: resolveBrandingAssetUrl(branding.favicon_path),
    }),
    [branding, isLoading, isFetching]
  );

  return (
    <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
