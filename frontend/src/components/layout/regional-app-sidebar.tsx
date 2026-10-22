"use client";

import { useState, useEffect, useMemo } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { canAccessItem } from "@/lib/can-access";
import { usePermissions } from "@/hooks/usePermissions";
import { useBranding } from "@/providers/BrandingProvider";
import {
  sidebarTopNavClasses,
  sidebarTopNavCollapsibleClasses,
  sidebarSubNavClasses,
} from "@/lib/branding/sidebarNavClasses";
import { isNavChildActive } from "@/lib/navigationActive";
import { REGIONAL_NAVIGATION } from "@/regional.navigation.config";

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

export function RegionalAppSidebar({ regionId }: { regionId?: string }) {
  const [mounted, setMounted] = useState(false);
  const { branding, logoPrimaryUrl } = useBranding();
  const { permissions: userPermissions } = usePermissions();
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ id?: string }>();

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeRegionId = regionId || params?.id;
  const isRegionsPrefixed = pathname.includes("/regions/");
  const basePath = activeRegionId
    ? isRegionsPrefixed
      ? `/regions/${activeRegionId}`
      : `/${activeRegionId}`
    : "/regional";

  const regionalNavItems = useMemo(() => {
    return REGIONAL_NAVIGATION.map((item) => {
      const mappedUrl =
        item.url === "/regional" || item.url === "/regional/dashboard"
          ? basePath
          : item.url.replace(/^\/regional/, basePath);

      const mappedChildren = item.children?.map((child) => ({
        ...child,
        url: child.url.replace(/^\/regional/, basePath),
      }));

      return {
        ...item,
        url: mappedUrl,
        children: mappedChildren,
      };
    });
  }, [basePath]);

  const visibleNav = useMemo(
    () =>
      regionalNavItems
        .filter((item) => canAccessItem(item, userPermissions))
        .map((item) => ({
          ...item,
          children: item.children?.filter((child) =>
            canAccessItem(child, userPermissions)
          ),
        }))
        .filter((item) => !item.children || item.children.length > 0),
    [regionalNavItems, userPermissions]
  );

  return (
    <Sidebar collapsible="icon" variant="floating" className="hide-scrollbar">
      {/* ---------- HEADER ---------- */}
      <SidebarHeader className="py-10">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href={basePath} className="flex flex-col items-center">
              {logoPrimaryUrl ? (
                <Image
                  src={logoPrimaryUrl}
                  alt={`${branding.system_name_short || "Regional"} logo`}
                  width={100}
                  height={100}
                  className="mx-auto mb-1 rounded-xl p-2"
                  unoptimized
                />
              ) : null}
              <div className="grid flex-1 text-center gap-1 text-sm leading-tight group-data-[collapsible=icon]:opacity-0">
                <span className="truncate font-semibold text-sidebar-header-text">
                  {branding.system_name_short || "Regional Workspace"}
                </span>
                <span className="truncate text-xs text-sidebar-header-text/80">
                  {branding.system_tagline ||
                    branding.system_name_full ||
                    "Regional Administration"}
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
                const hasChildren = item.children && item.children.length > 0;
                const childUrls = item.children?.map((child) => child.url) ?? [];

                if (hasChildren) {
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
                                  <Link
                                    href={child.url}
                                    className="flex items-center gap-4"
                                  >
                                    <child.icon className="h-4 w-4 shrink-0" />
                                    <span className="whitespace-nowrap truncate">
                                      {child.title}
                                    </span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                const isActive =
                  pathname === item.url ||
                  (item.url !== basePath && pathname.startsWith(`${item.url}/`));

                return (
                  <SidebarMenuItem
                    key={item.url}
                    className="group-data-[collapsible=icon]:w-fit"
                  >
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
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
