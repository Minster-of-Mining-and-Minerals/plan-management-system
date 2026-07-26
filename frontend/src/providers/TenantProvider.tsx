"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import {
  useGetTenantBrandingQuery,
  useGetMyFacilityAssignmentsQuery,
  OrganizationTenant,
  Facility,
  UserFacilityAssignment,
  TenantBranding,
} from "@/redux/api/tenantApi";

interface TenantContextValue {
  activeTenant: OrganizationTenant | null;
  activeFacility: Facility | null;
  assignments: UserFacilityAssignment[];
  branding: TenantBranding | null;
  setActiveTenant: (tenant: OrganizationTenant | null) => void;
  setActiveFacility: (facility: Facility | null) => void;
  isLoading: boolean;
}

const DEFAULT_BRANDING: TenantBranding = {
  tenant_id: "DEFAULT_HOSPITAL",
  application_name: "NovaCure EHR",
  logo_url: "/logo.png",
  favicon_url: "/favicon.ico",
  colors: {
    primary: "#0284c7",
    primary_hover: "#0369a1",
    secondary: "#475569",
    accent: "#0d9488",
    background: "#f8fafc",
  },
};

const TenantContext = createContext<TenantContextValue>({
  activeTenant: null,
  activeFacility: null,
  assignments: [],
  branding: DEFAULT_BRANDING,
  setActiveTenant: () => {},
  setActiveFacility: () => {},
  isLoading: false,
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [activeTenant, setActiveTenant] = useState<OrganizationTenant | null>(null);
  const [activeFacility, setActiveFacility] = useState<Facility | null>(null);

  const { data: assignmentsData, isLoading: isAssignmentsLoading } = useGetMyFacilityAssignmentsQuery();
  const { data: brandingData, isLoading: isBrandingLoading } = useGetTenantBrandingQuery(
    activeTenant?.tenant_id || "DEFAULT_HOSPITAL"
  );

  const assignments = useMemo(() => assignmentsData || [], [assignmentsData]);
  const branding = useMemo(() => brandingData || DEFAULT_BRANDING, [brandingData]);

  // Set default active facility upon initial assignments load
  useEffect(() => {
    if (assignments.length > 0 && !activeFacility) {
      const defaultAssignment = assignments.find((a) => a.is_default) || assignments[0];
      if (defaultAssignment.facility) {
        setActiveFacility(defaultAssignment.facility);
      }
      if (defaultAssignment.tenant) {
        setActiveTenant(defaultAssignment.tenant);
      }
    }
  }, [assignments, activeFacility]);

  // Dynamic branding theme applier
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const colors = branding.colors || DEFAULT_BRANDING.colors;

    root.style.setProperty("--brand-primary", colors.primary);
    if (colors.primary_hover) root.style.setProperty("--brand-primary-hover", colors.primary_hover);
    if (colors.secondary) root.style.setProperty("--brand-secondary", colors.secondary);
    if (colors.accent) root.style.setProperty("--brand-accent", colors.accent);
    if (colors.background) root.style.setProperty("--brand-bg", colors.background);

    if (branding.application_name) {
      document.title = branding.application_name;
    }

    if (branding.favicon_url) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.getElementsByTagName("head")[0].appendChild(link);
      }
      link.href = branding.favicon_url;
    }
  }, [branding]);

  return (
    <TenantContext.Provider
      value={{
        activeTenant,
        activeFacility,
        assignments,
        branding,
        setActiveTenant,
        setActiveFacility,
        isLoading: isAssignmentsLoading || isBrandingLoading,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
