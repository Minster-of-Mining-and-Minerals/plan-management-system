"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { useGetActiveBrandingQuery } from "@/redux/api/brandingApi";
import type { SystemBranding } from "@/redux/types/branding";
import {
  applyBrandingTheme,
  DEFAULT_BRANDING,
  resolveBranding,
} from "@/utils/applyBrandingTheme";

interface BrandingContextValue {
  branding: SystemBranding;
  isLoading: boolean;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  isLoading: true,
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isFetching } = useGetActiveBrandingQuery();

  const branding = useMemo(() => resolveBranding(data), [data]);

  useEffect(() => {
    applyBrandingTheme(branding);
  }, [branding]);

  return (
    <BrandingContext.Provider
      value={{ branding, isLoading: isLoading || isFetching }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
