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
import { PURCHASING_CENTER_NAVIGATION } from "@/purchasingCenter.navigation.config";

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

export function PurchasingCenterAppSidebar({ centerId }: { centerId?: string }) {
  const [mounted, setMounted] = useState(false);
  const { branding, logoPrimaryUrl } = useBranding();
  const { permissions: userPermissions } = usePermissions();
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ id?: string }>();

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeCenterId = centerId || params?.id;
  const basePath = activeCenterId
    ? `/purchasing-centers/${activeCenterId}`
    : "/purchasing-center";

  const centerNavItems = useMemo(() => {
    return PURCHASING_CENTER_NAVIGATION.map((item) => {
      const mappedUrl =
        item.url === "/purchasing-center" || item.url === "/purchasing-center/dashboard"
          ? basePath
          : item.url.replace(/^\/purchasing-center/, basePath);

      const mappedChildren = item.children?.map((child) => ({
        ...child,
        url: child.url.replace(/^\/purchasing-center/, basePath),
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
      centerNavItems
        .filter((item) => canAccessItem(item, userPermissions))
        .map((item) => ({
          ...item,
          children: item.children?.filter((child) =>
            canAccessItem(child, userPermissions)
          ),
        }))
        .filter((item) => !item.children || item.children.length > 0),
    [centerNavItems, userPermissions]
  );

  return (
    <Sidebar collapsible="icon" variant="floating" className="hide-scrollbar">
      {/* ---------- HEADER ---------- */}
      <SidebarHeader className="py-10">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href={basePath as any} className="flex flex-col items-center">
              {logoPrimaryUrl ? (
                <Image
                  src={logoPrimaryUrl}
                  alt={`${branding.system_name_short || "Center"} logo`}
                  width={100}
                  height={100}
                  className="mx-auto mb-1 rounded-xl p-2"
                  unoptimized
                />
              ) : null}
              <div className="grid flex-1 text-center gap-1 text-sm leading-tight group-data-[collapsible=icon]:opacity-0">
                <span className="truncate font-semibold text-sidebar-header-text">
                  {branding.system_name_short || "Purchasing Center"}
                </span>
                <span className="truncate text-xs text-sidebar-header-text/80">
                  {branding.system_tagline || "Mineral Operations"}
                </span>
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ---------- CONTENT ---------- */}
      <SidebarContent className="hide-scrollbar">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNav.map((item) => {
                const isSectionOpen = mounted
                  ? isNavSectionActive(pathname, item)
                  : false;

                // Collapsible section with children
                if (item.children && item.children.length > 0) {
                  return (
                    <Collapsible
                      key={item.title}
                      defaultOpen={isSectionOpen}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.title}
                            className={sidebarTopNavCollapsibleClasses}
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.children.map((child) => {
                              const childUrls =
                                item.children?.map((c) => c.url) ?? [];
                              const isChildActive = mounted
                                ? isNavChildActive(
                                    pathname,
                                    child.url,
                                    childUrls
                                  )
                                : false;

                              return (
                                <SidebarMenuSubItem key={child.title}>
                                  <SidebarMenuSubButton
                                    asChild
                                    className={sidebarSubNavClasses}
                                  >
                                    <Link href={child.url as any}>
                                      <child.icon className="h-4 w-4" />
                                      <span>{child.title}</span>
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

                // Simple nav link without children
                const isSimpleActive = mounted
                  ? pathname === item.url ||
                    (item.url !== basePath && pathname.startsWith(`${item.url}/`))
                  : false;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      className={sidebarTopNavClasses}
                    >
                      <Link href={item.url as any}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
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
