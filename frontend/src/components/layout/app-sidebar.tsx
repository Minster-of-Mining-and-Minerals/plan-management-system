"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandingLogo, BrandingName } from "@/components/common/BrandingLogo";
import { ChevronRight } from "lucide-react";

import { NAVIGATION, type NavItem } from "@/navigation.config";
import { canAccessItem } from "@/lib/can-access";
import { usePermissions } from "@/hooks/usePermissions";

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

const stripLocale = (pathname: string) => {
  const segments = pathname.split("/");
  if (segments.length > 1 && ["en", "am"].includes(segments[1])) {
    return "/" + segments.slice(2).join("/");
  }
  return pathname;
};

type AppSidebarProps = {
  navigation?: NavItem[];
  showPermissionFilter?: boolean;
  profileHref?: string;
};

export function AppSidebar({
  navigation = NAVIGATION,
  showPermissionFilter = true,
  profileHref = "/profile",
}: AppSidebarProps) {
  const { permissions: userPermissions } = usePermissions();
  const pathname = stripLocale(usePathname());

  const visibleNav = navigation
    .map((item) => ({
      ...item,
      children: showPermissionFilter
        ? item.children?.filter((c) => canAccessItem(c, userPermissions))
        : item.children,
    }))
    .filter((item) => {
      if (item.children?.length) return true;
      return showPermissionFilter
        ? canAccessItem(item, userPermissions)
        : true;
    });

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader className="py-10">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href={profileHref} className="flex flex-col items-center">
              <BrandingLogo
                variant="compact"
                width={100}
                height={100}
                className="mx-auto mb-1 rounded-xl p-2"
              />
              <div className="grid flex-1 text-center gap-1 text-sm leading-tight group-data-[collapsible=icon]:opacity-0 px-2">
                <BrandingName className="font-semibold text-section-accent text-xs whitespace-normal" />
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-5 group-data-[collapsible=icon]:px-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-2 group-data-[collapsible=icon]:items-center">
              {visibleNav.map((item) => {
                const hasConfigChildren = item.children && item.children.length > 0;

                if (hasConfigChildren) {
                  return (
                    <Collapsible
                      key={item.title}
                      asChild
                      defaultOpen={pathname.startsWith(item.url)}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem className="group-data-[collapsible=icon]:w-fit">
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.title}
                            isActive={pathname.startsWith(item.url)}
                            className="text-primary hover:bg-sidebar-hover hover:data-[active=false]:bg-sidebar-hover
                              hover:data-[active=true]:bg-section-accent hover:data-[active=true]:text-primary-foreground
                              px-5 py-5 group-data-[collapsible=icon]:px-2
                              group-data-[collapsible=icon]:justify-center
                              data-[active=true]:bg-section-accent data-[active=true]:text-primary-foreground"
                          >
                            <Link
                              href={item.url}
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
                                  isActive={pathname === child.url}
                                  className="text-primary hover:bg-sidebar-hover
                                    hover:data-[active=false]:bg-sidebar-hover
                                    hover:data-[active=true]:bg-sidebar-hover
                                    hover:data-[active=true]:text-primary-foreground
                                    group-data-[collapsible=icon]:justify-center
                                    data-[active=true]:bg-sidebar-hover
                                    data-[active=true]:text-primary"
                                >
                                  <Link href={child.url} className="flex items-center gap-4">
                                    <child.icon className="h-4 w-4 shrink-0" />
                                    <span className="whitespace-nowrap truncate">{child.title}</span>
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

                return (
                  <SidebarMenuItem
                    key={item.url}
                    className="group-data-[collapsible=icon]:w-fit"
                  >
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                      className="text-primary hover:bg-sidebar-hover px-5 py-5
                        group-data-[collapsible=icon]:px-2
                        group-data-[collapsible=icon]:justify-center
                        data-[active=true]:bg-section-accent
                        data-[active=true]:text-primary-foreground"
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
