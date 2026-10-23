"use strict";
"use client";

import { useState, useEffect, useMemo } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronRight, Building2 } from "lucide-react";
import { canAccessItem } from "@/lib/can-access";
import { usePermissions } from "@/hooks/usePermissions";
import { useBranding } from "@/providers/BrandingProvider";
import {
  sidebarTopNavClasses,
  sidebarTopNavCollapsibleClasses,
  sidebarSubNavClasses,
} from "@/lib/branding/sidebarNavClasses";
import { isNavChildActive } from "@/lib/navigationActive";
import { COMPANY_NAVIGATION } from "@/company.navigation.config";

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

export function CompanyAppSidebar({ companyId }: { companyId?: string }) {
  const [mounted, setMounted] = useState(false);
  const { branding, logoPrimaryUrl } = useBranding();
  const { permissions: userPermissions } = usePermissions();
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ id?: string }>();

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeCompanyId = companyId || params?.id;
  const basePath = `/companies/${activeCompanyId}`;

  const companyNavItems = useMemo(() => {
    return COMPANY_NAVIGATION.map((item) => {
      const mappedUrl =
        item.url === "/company" || item.url === "/company/dashboard"
          ? basePath
          : item.url.replace(/^\/company/, basePath);

      const mappedChildren = item.children?.map((child) => ({
        ...child,
        url: child.url.replace(/^\/company/, basePath),
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
      companyNavItems
        .filter((item) => canAccessItem(item, userPermissions))
        .map((item) => ({
          ...item,
          children: item.children?.filter((child) =>
            canAccessItem(child, userPermissions)
          ),
        }))
        .filter((item) => !item.children || item.children.length > 0),
    [companyNavItems, userPermissions]
  );

  return (
    <Sidebar collapsible="icon" variant="floating" className="hide-scrollbar">
      {/* ---------- HEADER ---------- */}
      <SidebarHeader className="py-8">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href={basePath} className="flex flex-col items-center">
              {logoPrimaryUrl ? (
                <div className="relative w-16 h-16 rounded-xl border border-border/80 bg-white/90 p-1.5 shadow-xs mb-2 overflow-hidden">
                  <Image
                    src={logoPrimaryUrl}
                    alt={`${branding.system_name_short || "Company"} logo`}
                    fill
                    className="object-contain p-1"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <Building2 className="w-6 h-6" />
                </div>
              )}
              <div className="grid flex-1 text-center gap-1 text-sm leading-tight group-data-[collapsible=icon]:opacity-0">
                <span className="truncate font-semibold text-sidebar-header-text">
                  {branding.system_name_short || "Company Workspace"}
                </span>
                <span className="truncate text-xs text-sidebar-header-text/80">
                  {branding.system_tagline ||
                    branding.system_name_full ||
                    "Mining Enterprise Operations"}
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
                            <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <SidebarMenuSub className="gap-1.5 pl-6 group-data-[collapsible=icon]:hidden">
                            {item.children?.map((child) => {
                              const isChildActive = isNavChildActive(
                                pathname,
                                child.url,
                                childUrls
                              );

                              return (
                                <SidebarMenuSubItem key={child.title}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={isChildActive}
                                    className={sidebarSubNavClasses}
                                  >
                                    <Link
                                      href={child.url}
                                      className="flex items-center gap-3 text-sm py-2 px-3"
                                    >
                                      <child.icon className="size-4 shrink-0" />
                                      <span className="truncate">
                                        {child.title}
                                      </span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                const isActive = isNavSectionActive(pathname, item);

                return (
                  <SidebarMenuItem
                    key={item.title}
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
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
