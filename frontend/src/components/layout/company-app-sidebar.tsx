"use strict";
"use client";

import { useState, useEffect, useMemo } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Building2 } from "lucide-react";
import { canAccessItem } from "@/lib/can-access";
import { usePermissions } from "@/hooks/usePermissions";
import { useBranding } from "@/providers/BrandingProvider";
import {
  COMPANY_CATEGORIZED_NAVIGATION,
  type NavCategory,
  type NavItem,
} from "@/company.navigation.config";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function CompanyAppSidebar({ companyId }: { companyId?: string }) {
  const [mounted, setMounted] = useState(false);
  const { branding, logoPrimaryUrl } = useBranding();
  const { permissions: userPermissions } = usePermissions();
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeCompanyId = companyId || params?.id;
  const basePath = `/companies/${activeCompanyId}`;

  // Map category navigation URLs with active company basePath
  const categorizedNav = useMemo<NavCategory[]>(() => {
    return COMPANY_CATEGORIZED_NAVIGATION.map((cat) => {
      const mappedItems = cat.items.map((item) => {
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

      return {
        category: cat.category,
        items: mappedItems,
      };
    });
  }, [basePath]);

  // Filter accessible items based on user permissions
  const visibleCategories = useMemo<NavCategory[]>(() => {
    return categorizedNav
      .map((cat) => {
        const visibleItems = cat.items
          .filter((item) => canAccessItem(item, userPermissions))
          .map((item) => ({
            ...item,
            children: item.children?.filter((child) =>
              canAccessItem(child, userPermissions)
            ),
          }))
          .filter((item) => !item.children || item.children.length > 0);

        return {
          category: cat.category,
          items: visibleItems,
        };
      })
      .filter((cat) => cat.items.length > 0);
  }, [categorizedNav, userPermissions]);

  // Active check helper:
  // Root Dashboard is ONLY active on exact match with basePath or basePath/dashboard.
  // Other items are active on exact match or subpath.
  const isDashboardUrl = (url: string) =>
    url === basePath || url === `${basePath}/dashboard`;

  const isItemActive = (itemUrl: string) => {
    if (isDashboardUrl(itemUrl)) {
      return (
        pathname === basePath ||
        pathname === `${basePath}/dashboard` ||
        pathname === `${basePath}/`
      );
    }
    return pathname === itemUrl || pathname.startsWith(`${itemUrl}/`);
  };

  return (
    <Sidebar
      collapsible="icon"
      variant="floating"
      className="bg-[#0B1E33] border-r border-[#152E4A] text-slate-100 hide-scrollbar"
    >
      {/* ---------- HEADER ---------- */}
      <SidebarHeader className="py-6 px-4 border-b border-slate-800/80 bg-[#0B1E33]">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href={basePath} className="flex items-center gap-3">
              {logoPrimaryUrl ? (
                <div className="relative w-11 h-11 rounded-full border border-amber-500/30 bg-white/95 p-1 shadow-sm shrink-0 overflow-hidden">
                  <Image
                    src={logoPrimaryUrl}
                    alt={`${branding.system_name_short || "Company"} logo`}
                    fill
                    className="object-contain p-0.5"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shrink-0 shadow-sm font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
              )}
              <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-bold text-sm text-white tracking-tight">
                  {branding.system_name_short || "Company Workspace"}
                </span>
                <span className="truncate text-[11px] text-slate-400">
                  {branding.system_tagline || "Mining Operations & Target Management"}
                </span>
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ---------- CATEGORIZED SIDEBAR CONTENT ---------- */}
      <SidebarContent className="px-3 py-3 space-y-4 hide-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-[#0B1E33]">
        {visibleCategories.map((cat, catIdx) => (
          <div key={cat.category || catIdx} className="space-y-1">
            {/* Category Header Label */}
            <div className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase select-none group-data-[collapsible=icon]:hidden">
              {cat.category}
            </div>

            {/* Category Items */}
            <div className="space-y-1">
              {cat.items.map((item) => {
                const hasChildren = item.children && item.children.length > 0;
                const active = isItemActive(item.url);

                return (
                  <div key={item.title} className="space-y-1">
                    {/* Top Level Item */}
                    <Link
                      href={item.url}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group-data-[collapsible=icon]:justify-center ${
                        active
                          ? "bg-[#E5A93C] text-slate-950 font-bold shadow-xs hover:bg-[#d89c30]"
                          : "text-slate-300 hover:text-white hover:bg-white/10"
                      }`}
                      title={item.title}
                    >
                      <item.icon
                        className={`size-4.5 shrink-0 ${
                          active ? "text-slate-950" : "text-slate-400"
                        }`}
                      />
                      <span className="truncate group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>
                    </Link>

                    {/* Directly Displayed Indented Children */}
                    {hasChildren && (
                      <div className="ml-4 pl-3 border-l border-slate-700/60 my-1 space-y-1 group-data-[collapsible=icon]:hidden">
                        {item.children?.map((child) => {
                          const childActive = isItemActive(child.url);

                          return (
                            <Link
                              key={child.title}
                              href={child.url}
                              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all ${
                                childActive
                                  ? "bg-[#E5A93C] text-slate-950 font-bold shadow-xs hover:bg-[#d89c30]"
                                  : "text-slate-300 hover:text-white hover:bg-white/10"
                              }`}
                              title={child.title}
                            >
                              <child.icon
                                className={`size-3.5 shrink-0 ${
                                  childActive ? "text-slate-950" : "text-slate-400"
                                }`}
                              />
                              <span className="truncate">{child.title}</span>
                            </Link>
                          );
                        })}
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
