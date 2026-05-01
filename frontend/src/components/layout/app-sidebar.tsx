"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

import { NAVIGATION } from "@/navigation.config";
import { canAccessItem } from "@/lib/can-access";
import { PermissionKey } from "@/lib/permissions";
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

export function AppSidebar() {
  const { permissions: userPermissions } = usePermissions();
  const pathname = stripLocale(usePathname());

  const visibleNav = NAVIGATION.filter((item) =>
    canAccessItem(item, userPermissions)
  ).map((item) => ({
    ...item,
    children: item.children?.filter((c) =>
      canAccessItem(c, userPermissions)
    ),
  }));

  return (
    <Sidebar collapsible="icon" variant="floating">
      {/* ---------- HEADER ---------- */}
      <SidebarHeader className="py-10">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/dashboard" className="flex flex-col items-center">
              <Image
                src="/logo-only.png"
                alt="Minister of Mining Logo"
                width={100}
                height={100}
                className="mx-auto mb-1 rounded-xl p-2"
              />
              <div className="grid flex-1 text-center gap-1 text-sm leading-tight group-data-[collapsible=icon]:opacity-0">
                <span className="truncate font-semibold text-golden-dark">
                  Minister of Mining
                </span>
                <span className="truncate text-golden-dark">
                  Compliance Management System
                </span>
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ---------- CONTENT ---------- */}
      <SidebarContent>
        <SidebarGroup className="px-5 group-data-[collapsible=icon]:px-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-2 group-data-[collapsible=icon]:items-center">

              {visibleNav.map((item) =>
                item.children?.length ? (
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
                          className="text-primary hover:bg-golden-metallic hover:data-[active=false]:bg-golden-metallic
                            hover:data-[active=true]:bg-golden-dark hover:data-[active=true]:text-primary-foreground
                            px-5 py-5 group-data-[collapsible=icon]:px-2
                            group-data-[collapsible=icon]:justify-center
                            data-[active=true]:bg-golden-dark data-[active=true]:text-primary-foreground"
                        >
                          <item.icon className="group-data-[collapsible=icon]:size-5" />
                          <span className="text-base group-data-[collapsible=icon]:hidden">
                            {item.title}
                          </span>
                          <ChevronRight
                            className="ml-auto transition-transform duration-200
                            group-data-[state=open]/collapsible:rotate-90
                            group-data-[collapsible=icon]:hidden"
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <SidebarMenuSub className="pt-1">
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.url}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === child.url}
                                className="text-primary hover:bg-golden-metallic
                                  hover:data-[active=false]:bg-golden-metallic
                                  hover:data-[active=true]:bg-golden-metallic
                                  hover:data-[active=true]:text-primary-foreground
                                  group-data-[collapsible=icon]:justify-center
                                  data-[active=true]:bg-golden-metallic
                                  data-[active=true]:text-primary"
                              >
                                <Link href={child.url}>
                                  <child.icon className="h-4 w-4" />
                                  <span>{child.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem
                    key={item.url}
                    className="group-data-[collapsible=icon]:w-fit"
                  >
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                      className="text-primary hover:bg-golden-metallic px-5 py-5
                        group-data-[collapsible=icon]:px-2
                        group-data-[collapsible=icon]:justify-center
                        data-[active=true]:bg-golden-dark
                        data-[active=true]:text-primary-foreground"
                    >
                      <Link
                        href={item.url}
                        className="flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:items-center"
                      >
                        <item.icon className="group-data-[collapsible=icon]:size-5" />
                        <span className="text-base group-data-[collapsible=icon]:hidden">
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
