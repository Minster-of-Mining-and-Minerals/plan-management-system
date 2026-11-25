"use strict";
"use client";

import { useState, useEffect, useMemo } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import Image from "next/image";
import { Building2, ChevronRight } from "lucide-react";
import { canAccessItem } from "@/lib/can-access";
import { usePermissions } from "@/hooks/usePermissions";
import { useSession } from "next-auth/react";
import { useBranding } from "@/providers/BrandingProvider";
import {
  PRIVATE_CATEGORIZED_NAVIGATION,
  type NavCategory,
  type NavItem,
} from "@/navigation.config";
import { isNavChildActive } from "@/lib/navigationActive";

import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";
import { useGetRegionsQuery } from "@/redux/api/regionApi";
import { useGetCompaniesQuery } from "@/redux/api/companyApi";
import { useGetPurchasingCentersQuery } from "@/redux/api/purchasingCenterApi";
import { GovernmentStructure } from "@/redux/types/governmentStructure";
import { buildSectorTree } from "@/utils/buildSectorTree";
import { useGovernmentStructureListParams } from "@/hooks/useGovernmentStructureListParams";
import { NavStructures } from "./nav-structures";
import { NavRegions } from "./nav-regions";
import { NavCompanies } from "./nav-companies";
import { NavPurchasingCenters } from "./nav-purchasing-centers";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const [mounted, setMounted] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const { data: session, status } = useSession();
  const { branding, logoPrimaryUrl } = useBranding();
  const { permissions: userPermissions } = usePermissions();
  const pathname = usePathname();

  const isAuthReady = status === "authenticated" && Boolean(session?.accessToken);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter accessible items based on user permissions
  // If a user has no permission for all the tabs under a category, the category will not be displayed
  const visibleCategories = useMemo<NavCategory[]>(() => {
    return PRIVATE_CATEGORIZED_NAVIGATION
      .map((cat) => {
        const visibleItems = cat.items
          .map((item) => {
            // If item has config children (child tabs)
            if (item.children && item.children.length > 0) {
              const visibleChildren = item.children.filter((child) =>
                canAccessItem(child, userPermissions)
              );
              // If user has no permission for all the child tabs under this item, hide it
              if (visibleChildren.length === 0) {
                return null;
              }
              return {
                ...item,
                children: visibleChildren,
              };
            }

            // Standalone or dynamic item/tab
            if (!canAccessItem(item, userPermissions)) {
              return null;
            }

            return item;
          })
          .filter((item): item is NavItem => item !== null);

        return {
          category: cat.category,
          items: visibleItems,
        };
      })
      .filter((cat) => cat.items.length > 0);
  }, [userPermissions]);

  const allVisibleItems = useMemo(
    () => visibleCategories.flatMap((c) => c.items),
    [visibleCategories]
  );

  // Dynamic tree queries
  const canAccessGovStructures = allVisibleItems.some(
    (item) => item.url === "/government-structures"
  );
  const structureListParams = useGovernmentStructureListParams({ is_active: true });
  const { data: structuresData } = useGetGovernmentStructuresQuery(
    structureListParams.params,
    {
      skip: !isAuthReady || structureListParams.skip || !canAccessGovStructures,
      refetchOnMountOrArgChange: true,
    }
  );
  const structuresById = useMemo(() => {
    const map = new Map<string, GovernmentStructure>();
    for (const structure of structuresData || []) {
      if (structure.government_structure_id) {
        map.set(structure.government_structure_id, structure);
      }
    }
    return map;
  }, [structuresData]);
  const structureTree = buildSectorTree(structuresData || []);

  const canAccessRegions = allVisibleItems.some((item) => item.url === "/admin/regions");
  const { data: regionsData } = useGetRegionsQuery(
    { is_active: true },
    {
      skip: !isAuthReady || !canAccessRegions,
      refetchOnMountOrArgChange: true,
    }
  );

  const canAccessCompanies = allVisibleItems.some((item) => item.url === "/admin/companies");
  const { data: companiesData } = useGetCompaniesQuery(
    { is_active: true },
    {
      skip: !isAuthReady || !canAccessCompanies,
      refetchOnMountOrArgChange: true,
    }
  );

  const canAccessPurchasingCenters = allVisibleItems.some(
    (item) => item.url === "/admin/purchasing-centers"
  );
  const { data: purchasingCentersData } = useGetPurchasingCentersQuery(
    undefined,
    {
      skip: !isAuthReady || !canAccessPurchasingCenters,
      refetchOnMountOrArgChange: true,
    }
  );

  // Active check helper
  const isDashboardUrl = (url: string) => url === "/dashboard" || url === "/";

  const isItemActive = (itemUrl: string) => {
    if (isDashboardUrl(itemUrl)) {
      return pathname === "/dashboard" || pathname === "/";
    }
    return pathname === itemUrl || pathname.startsWith(`${itemUrl}/`);
  };

  const isAnyChildActive = (item: NavItem) => {
    if (item.children && item.children.length > 0) {
      const childUrls = item.children.map((child) => child.url);
      if (
        item.children.some((child) =>
          isNavChildActive(pathname, child.url, childUrls)
        )
      )
        return true;
    }
    if (item.url === "/government-structures" && pathname.startsWith("/government-structures"))
      return true;
    if (
      item.url === "/admin/regions" &&
      (pathname.startsWith("/admin/regions") || pathname.startsWith("/regions/"))
    )
      return true;
    if (
      item.url === "/admin/companies" &&
      (pathname.startsWith("/admin/companies") || pathname.startsWith("/companies/"))
    )
      return true;
    if (
      item.url === "/admin/purchasing-centers" &&
      (pathname.startsWith("/admin/purchasing-centers") ||
        pathname.startsWith("/purchasing-centers/"))
    )
      return true;
    return false;
  };

  const toggleSection = (title: string, defaultOpen: boolean) => {
    setOpenSections((prev) => ({
      ...prev,
      [title]: prev[title] !== undefined ? !prev[title] : !defaultOpen,
    }));
  };

  return (
    <Sidebar
      collapsible="icon"
      variant="floating"
      className="bg-white dark:bg-card border-r border-border text-foreground hide-scrollbar shadow-xs"
    >
      {/* ---------- HEADER ---------- */}
      <SidebarHeader className="py-5 px-4 border-b border-border/80 bg-white dark:bg-card">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/dashboard" className="flex items-center gap-3">
              {logoPrimaryUrl ? (
                <div className="relative w-10 h-10 rounded-full border border-border bg-muted/20 p-1 shadow-xs shrink-0 overflow-hidden">
                  <Image
                    src={logoPrimaryUrl}
                    alt={`${branding.system_name_short || "Federal"} logo`}
                    fill
                    className="object-contain p-0.5"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-xs font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
              )}
              <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-bold text-sm text-foreground tracking-tight">
                  {branding.system_name_short || "Ministry of Mines"}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {branding.system_tagline ||
                    branding.system_name_full ||
                    "Plan Management & Sector Oversight"}
                </span>
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ---------- CATEGORIZED SIDEBAR CONTENT (WHITE BG) ---------- */}
      <SidebarContent className="px-3 py-3 space-y-4 hide-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-white dark:bg-card">
        {visibleCategories.map((cat, catIdx) => (
          <div key={cat.category || catIdx} className="space-y-1">
            {/* Category Header Label */}
            <div className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase select-none group-data-[collapsible=icon]:hidden">
              {cat.category}
            </div>

            {/* Category Items */}
            <div className="space-y-1">
              {cat.items.map((item) => {
                const hasConfigChildren = item.children && item.children.length > 0;
                const isGovStructures = item.url === "/government-structures";
                const isRegions = item.url === "/admin/regions";
                const isCompanies = item.url === "/admin/companies";
                const isPurchasingCenters = item.url === "/admin/purchasing-centers";
                const hasDynamicChildren =
                  isGovStructures || isRegions || isCompanies || isPurchasingCenters;
                const hasChildren = hasConfigChildren || hasDynamicChildren;
                const hasActiveChild = isAnyChildActive(item);
                const active = isItemActive(item.url) || hasActiveChild;

                // Default open if any child is active
                const defaultOpen = hasActiveChild;
                const isOpen =
                  openSections[item.title] !== undefined
                    ? openSections[item.title]
                    : defaultOpen;

                const childUrls = item.children?.map((c) => c.url) ?? [];

                return (
                  <div key={item.title} className="space-y-1">
                    {/* Top Level Item */}
                    <div className="flex items-center gap-1">
                      <Link
                        href={item.url}
                        className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group-data-[collapsible=icon]:justify-center ${
                          active
                            ? "bg-[#E5A93C] text-slate-950 font-bold shadow-xs hover:bg-[#d89c30]"
                            : "text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60"
                        }`}
                        title={item.title}
                      >
                        <item.icon
                          className={`size-4.5 shrink-0 ${
                            active
                              ? "text-slate-950"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        />
                        <span className="truncate group-data-[collapsible=icon]:hidden">
                          {item.title}
                        </span>
                      </Link>

                      {/* Collapsible Chevron Toggle Button for items with children */}
                      {hasChildren && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSection(item.title, defaultOpen);
                          }}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group-data-[collapsible=icon]:hidden"
                          aria-label={`Toggle ${item.title} menu`}
                        >
                          <ChevronRight
                            className={`size-3.5 transition-transform duration-200 ${
                              isOpen ? "rotate-90" : ""
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    {/* Collapsible Indented Children */}
                    {hasChildren && isOpen && (
                      <div className="ml-4 pl-3 border-l border-slate-200 dark:border-slate-800 my-1 space-y-1 group-data-[collapsible=icon]:hidden animate-in fade-in duration-150">
                        {/* Config Children Tabs */}
                        {hasConfigChildren &&
                          item.children?.map((child) => {
                            const childActive = isNavChildActive(
                              pathname,
                              child.url,
                              childUrls
                            );

                            return (
                              <Link
                                key={child.title}
                                href={child.url}
                                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all ${
                                  childActive
                                    ? "bg-[#E5A93C]/20 text-amber-950 dark:text-amber-200 font-semibold border-l-2 border-[#E5A93C] shadow-2xs hover:bg-[#E5A93C]/30"
                                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60"
                                }`}
                                title={child.title}
                              >
                                <child.icon
                                  className={`size-3.5 shrink-0 ${
                                    childActive
                                      ? "text-[#C7871C] dark:text-[#F3C973]"
                                      : "text-slate-400 dark:text-slate-500"
                                  }`}
                                />
                                <span className="truncate">{child.title}</span>
                              </Link>
                            );
                          })}

                        {/* Dynamic Sub-trees */}
                        {!hasConfigChildren && isGovStructures && (
                          <NavStructures
                            structures={structureTree}
                            structuresById={structuresById}
                            basePath={item.url}
                          />
                        )}

                        {!hasConfigChildren && isRegions && (
                          <NavRegions
                            regions={regionsData || []}
                            basePath={item.url}
                          />
                        )}

                        {!hasConfigChildren && isPurchasingCenters && (
                          <NavPurchasingCenters
                            centers={purchasingCentersData || []}
                            basePath={item.url}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
