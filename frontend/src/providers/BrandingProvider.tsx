"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { DEFAULT_BRANDING } from "@/lib/branding/defaults";
import {
  applyBrandingDocumentMeta,
  applyBrandingTheme,
  resolveBrandingAssetUrl,
} from "@/lib/branding/applyBrandingTheme";
import { useGetPublicBrandingQuery } from "@/redux/api/brandingApi";
import { useGetRegionalBrandingQuery } from "@/redux/api/regionApi";
import type { BrandingSettings } from "@/redux/types/branding";

type BrandingContextValue = {
  branding: BrandingSettings;
  isLoading: boolean;
  logoPrimaryUrl: string;
  logoSecondaryUrl: string;
  faviconUrl: string;
  isUsingDefault: boolean;
  resolvedFromStructureId: string | null;
  regionId?: string | null;
};

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  isLoading: true,
  logoPrimaryUrl: DEFAULT_BRANDING.logo_primary_path ?? "",
  logoSecondaryUrl: DEFAULT_BRANDING.logo_secondary_path ?? "",
  faviconUrl: DEFAULT_BRANDING.favicon_path ?? "",
  isUsingDefault: true,
  resolvedFromStructureId: null,
  regionId: null,
});

function resolveSessionStructureId(
  governmentStructure: unknown
): string | undefined {
  if (!governmentStructure || Array.isArray(governmentStructure)) {
    return undefined;
  }
  const structure = governmentStructure as { government_structure_id?: string };
  return structure.government_structure_id || undefined;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const regionId = session?.user?.region_id || null;

  const structureId = useMemo(
    () => (!regionId ? resolveSessionStructureId(session?.user?.government_structure) : undefined),
    [regionId, session?.user?.government_structure]
  );

  const queryArg = useMemo(
    () => (structureId ? { government_structure_id: structureId } : undefined),
    [structureId]
  );

  // Federal / global branding query (skipped if regional account)
  const { data: federalData, isLoading: federalLoading, isFetching: federalFetching } = useGetPublicBrandingQuery(
    queryArg,
    {
      skip: status === "loading" || Boolean(regionId),
      refetchOnMountOrArgChange: true,
    }
  );

  // Regional branding query (active only when user belongs to a region)
  const { data: regionalData, isLoading: regionalLoading, isFetching: regionalFetching } = useGetRegionalBrandingQuery(
    regionId as string,
    {
      skip: status === "loading" || !regionId,
      refetchOnMountOrArgChange: true,
    }
  );

  const effectiveData = regionId ? regionalData : federalData;
  const branding = (effectiveData as unknown as BrandingSettings) ?? DEFAULT_BRANDING;
  const isDataLoading = regionId
    ? regionalLoading || regionalFetching
    : federalLoading || federalFetching;

  useEffect(() => {
    if (!effectiveData) return;
    applyBrandingTheme(effectiveData as unknown as BrandingSettings, effectiveData.css_variables);
    applyBrandingDocumentMeta(effectiveData as unknown as BrandingSettings);
  }, [effectiveData]);

  const value = useMemo<BrandingContextValue>(
    () => ({
      branding,
      isLoading: isDataLoading || status === "loading",
      logoPrimaryUrl: resolveBrandingAssetUrl(branding.logo_primary_path),
      logoSecondaryUrl: resolveBrandingAssetUrl(branding.logo_secondary_path),
      faviconUrl: resolveBrandingAssetUrl(branding.favicon_path),
      isUsingDefault: effectiveData?.is_using_default ?? !structureId,
      resolvedFromStructureId: federalData?.resolved_from_structure_id ?? null,
      regionId,
    }),
    [branding, effectiveData, federalData, isDataLoading, regionId, status, structureId]
  );

  return (
    <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
