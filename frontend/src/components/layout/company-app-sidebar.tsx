"use strict";
"use client";

import { useState, useEffect, useMemo } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Building2, ChevronRight } from "lucide-react";
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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
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
  // If a user has no permission for all the tabs under a category, the category will not be displayed
  const visibleCategories = useMemo<NavCategory[]>(() => {
    return categorizedNav
      .map((cat) => {
        const visibleItems = cat.items
          .map((item) => {
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

            // Standalone item/tab
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

  const isAnyChildActive = (item: NavItem) => {
    if (!item.children || item.children.length === 0) return false;
    return item.children.some((child) => isItemActive(child.url));
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
            <Link href={basePath} className="flex items-center gap-3">
              {logoPrimaryUrl ? (
                <div className="relative w-10 h-10 rounded-full border border-border bg-muted/20 p-1 shadow-xs shrink-0 overflow-hidden">
                  <Image
                    src={logoPrimaryUrl}
                    alt={`${branding.system_name_short || "Company"} logo`}
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
                  {branding.system_name_short || "Company Workspace"}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {branding.system_tagline || "Mining Operations & Target Management"}
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
                const hasChildren = item.children && item.children.length > 0;
                const active = isItemActive(item.url);
                const hasActiveChild = isAnyChildActive(item);

                // Default open if any child is active
                const defaultOpen = hasActiveChild;
                const isOpen =
                  openSections[item.title] !== undefined
                    ? openSections[item.title]
                    : defaultOpen;

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

                      {/* Collapsible Chevron Toggle Button for items with children (Users) */}
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

                    {/* Collapsible Indented Children (Users List, Sessions, Roles, Groups, Permissions) */}
                    {hasChildren && isOpen && (
                      <div className="ml-4 pl-3 border-l border-slate-200 dark:border-slate-800 my-1 space-y-1 group-data-[collapsible=icon]:hidden animate-in fade-in duration-150">
                        {item.children?.map((child) => {
                          const childActive = isItemActive(child.url);

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
