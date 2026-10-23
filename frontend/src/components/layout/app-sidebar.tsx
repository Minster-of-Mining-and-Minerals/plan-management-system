"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

import { NAVIGATION } from "@/navigation.config";
import { canAccessItem } from "@/lib/can-access";
import { usePermissions } from "@/hooks/usePermissions";
import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";
import { useGetRegionsQuery } from "@/redux/api/regionApi";
import { useGetCompaniesQuery } from "@/redux/api/companyApi";
import { GovernmentStructure } from "@/redux/types/governmentStructure";
import { buildSectorTree } from "@/utils/buildSectorTree";
import { useGovernmentStructureListParams } from "@/hooks/useGovernmentStructureListParams";
import { NavStructures } from "./nav-structures";
import { NavRegions } from "./nav-regions";
import { NavCompanies } from "./nav-companies";
import { useSession } from "next-auth/react";
import { useBranding } from "@/providers/BrandingProvider";
import {
  sidebarSubNavClasses,
  sidebarTopNavClasses,
  sidebarTopNavCollapsibleClasses,
} from "@/lib/branding/sidebarNavClasses";
import { isNavChildActive } from "@/lib/navigationActive";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

function isNavSectionActive(
  pathname: string,
  item: { url: string; children?: { url: string }[] }
) {
  if (pathname === item.url || pathname.startsWith(`${item.url}/`)) {
    return true;
  }

  const childUrls = item.children?.map((child) => child.url) ?? [];
  return (
    item.children?.some((child) =>
      isNavChildActive(pathname, child.url, childUrls)
    ) ?? false
  );
}

export function AppSidebar() {
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession();
  const { branding, logoPrimaryUrl } = useBranding();
  const { permissions: userPermissions } = usePermissions();
  const pathname = usePathname();
  const router = useRouter();

  const isAuthReady =
    status === "authenticated" && Boolean(session?.accessToken);

  useEffect(() => {
    // Defer collapsible mount until after hydration to avoid Radix mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional client-only gate
    setMounted(true);
  }, []);

  const visibleNav = NAVIGATION.filter((item) =>
    canAccessItem(item, userPermissions)
  )
    .map((item) => ({
      ...item,
      children: item.children?.filter((c) =>
        canAccessItem(c, userPermissions)
      ),
    }))
    .filter((item) => !item.children || item.children.length > 0);

  const structureListParams = useGovernmentStructureListParams({ is_active: true });

  const { data: structuresData } = useGetGovernmentStructuresQuery(
    structureListParams.params,
    {
      skip: !isAuthReady || structureListParams.skip,
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

  const canAccessRegions = visibleNav.some((item) => item.url === "/admin/regions");
  const { data: regionsData } = useGetRegionsQuery(
    { is_active: true },
    {
      skip: !isAuthReady || !canAccessRegions,
      refetchOnMountOrArgChange: true,
    }
  );

  const canAccessCompanies = visibleNav.some((item) => item.url === "/admin/companies");
  const { data: companiesData } = useGetCompaniesQuery(
    { is_active: true },
    {
      skip: !isAuthReady || !canAccessCompanies,
      refetchOnMountOrArgChange: true,
    }
  );

  return (
    <Sidebar collapsible="icon" variant="floating" className="hide-scrollbar">
      {/* ---------- HEADER ---------- */}
      <SidebarHeader className="py-10">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/dashboard" className="flex flex-col items-center">
              {logoPrimaryUrl ? (
                <Image
                  src={logoPrimaryUrl}
                  alt={`${branding.system_name_short} logo`}
                  width={100}
                  height={100}
                  className="mx-auto mb-1 rounded-xl p-2"
                  unoptimized
                />
              ) : null}
              <div className="grid flex-1 text-center gap-1 text-sm leading-tight group-data-[collapsible=icon]:opacity-0">
                <span className="truncate font-semibold text-sidebar-header-text">
                  {branding.system_name_short}
                </span>
                <span className="truncate text-sidebar-header-text">
                  {branding.system_tagline || branding.system_name_full}
                </span>
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ---------- CONTENT ---------- */}
      <SidebarContent className="hide-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <SidebarGroup className="px-5 group-data-[collapsible=icon]:px-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-2 group-data-[collapsible=icon]:items-center">

              {visibleNav.map((item) => {
                const hasConfigChildren = item.children && item.children.length > 0;
                const isGovStructures = item.url === "/government-structures";
                const isRegions = item.url === "/admin/regions";
                const isCompanies = item.url === "/admin/companies";
                const hasDynamicChildren = isGovStructures || isRegions || isCompanies;
                const childUrls = item.children?.map((child) => child.url) ?? [];

                if (hasConfigChildren || hasDynamicChildren) {
                  if (!mounted) {
                    return (
                      <SidebarMenuItem
                        key={item.title}
                        className="group-data-[collapsible=icon]:w-fit"
                      >
                        <SidebarMenuButton
                          asChild
                          isActive={isNavSectionActive(pathname, item)}
                          tooltip={item.title}
                          className={sidebarTopNavClasses}
                        >
                          <Link
                            href={item.url}
                            className="flex items-center gap-4 group-data-[collapsible=icon]:justify-center"
                          >
                            <item.icon className="group-data-[collapsible=icon]:size-5 shrink-0" />
                            <span className="text-base whitespace-nowrap truncate group-data-[collapsible=icon]:hidden">
                              {item.title}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }

                  return (
                    <Collapsible
                      key={item.title}
                      asChild
                      defaultOpen={isNavSectionActive(pathname, item)}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem className="group-data-[collapsible=icon]:w-fit">
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.title}
                            isActive={isNavSectionActive(pathname, item)}
                            className={sidebarTopNavCollapsibleClasses}
                          >
                            <Link
                              href={item.url}
                              onClick={() => router.push(item.url)}
                              className="flex-1 flex items-center gap-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:items-center"
                            >
                              <item.icon className="group-data-[collapsible=icon]:size-5 shrink-0" />
                              <span className="text-base whitespace-nowrap truncate group-data-[collapsible=icon]:hidden">
                                {item.title}
                              </span>
                            </Link>
                            <ChevronRight
                              className="ml-auto transition-transform duration-200
                              group-data-[state=open]/collapsible:rotate-90
                              group-data-[collapsible=icon]:hidden"
                            />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          {hasConfigChildren ? (
                            <SidebarMenuSub className="pt-1">
                              {item.children?.map((child) => (
                                <SidebarMenuSubItem key={child.url}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={isNavChildActive(
                                      pathname,
                                      child.url,
                                      childUrls
                                    )}
                                    className={sidebarSubNavClasses}
                                  >
                                    <Link href={child.url} className="flex items-center gap-4">
                                      <child.icon className="h-4 w-4 shrink-0" />
                                      <span className="whitespace-nowrap truncate">{child.title}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          ) : isGovStructures ? (
                            <NavStructures
                              structures={structureTree}
                              structuresById={structuresById}
                              basePath={item.url}
                            />
                          ) : isRegions ? (
                            <NavRegions
                              regions={regionsData || []}
                              basePath={item.url}
                            />
                          ) : isCompanies ? (
                            <NavCompanies
                              companies={companiesData || []}
                              basePath={item.url}
                            />
                          ) : null}
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem
                    key={item.url}
                    className="group-data-[collapsible=icon]:w-fit"
                  >
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                      className={sidebarTopNavClasses}
                    >
                      <Link
                        href={item.url}
                        className="flex items-center gap-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:items-center"
                      >
                        <item.icon className="group-data-[collapsible=icon]:size-5 shrink-0" />
                        <span className="text-base whitespace-nowrap truncate group-data-[collapsible=icon]:hidden">
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
