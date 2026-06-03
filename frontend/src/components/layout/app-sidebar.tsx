"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

import { NAVIGATION } from "@/navigation.config";
import { canAccessItem } from "@/lib/can-access";
import { PermissionKey } from "@/lib/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";
import { buildSectorTree } from "@/utils/buildSectorTree";
import { NavStructures } from "./nav-structures";

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
  const [mounted, setMounted] = useState(false);
  const { permissions: userPermissions } = usePermissions();
  const pathname = stripLocale(usePathname());

  useEffect(() => {
    setMounted(true);
  }, []);

  const visibleNav = NAVIGATION.filter((item) =>
    canAccessItem(item, userPermissions)
  ).map((item) => ({
    ...item,
    children: item.children?.filter((c) =>
      canAccessItem(c, userPermissions)
    ),
  }));

  const { data: structuresData } = useGetGovernmentStructuresQuery();
  const structureTree = buildSectorTree(structuresData || []);

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
                  Plan Management System
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

              {visibleNav.map((item) => {
                const hasConfigChildren = item.children && item.children.length > 0;
                const isGovStructures = item.url === "/government-structures";
                const hasDynamicChildren = isGovStructures;

                if (hasConfigChildren || hasDynamicChildren) {
                  if (!mounted) {
                    return (
                      <SidebarMenuItem
                        key={item.title}
                        className="group-data-[collapsible=icon]:w-fit"
                      >
                        <SidebarMenuButton
                          asChild
                          isActive={pathname.startsWith(item.url)}
                          tooltip={item.title}
                          className="text-primary hover:bg-golden-metallic px-5 py-5
                            group-data-[collapsible=icon]:px-2
                            group-data-[collapsible=icon]:justify-center
                            data-[active=true]:bg-golden-dark
                            data-[active=true]:text-primary-foreground"
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
                          {hasConfigChildren ? (
                            <SidebarMenuSub className="pt-1">
                              {item.children?.map((child) => (
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
                                    <Link href={child.url} className="flex items-center gap-4">
                                      <child.icon className="h-4 w-4 shrink-0" />
                                      <span className="whitespace-nowrap truncate">{child.title}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          ) : (
                            <NavStructures structures={structureTree} basePath={item.url} />
                          )}
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
                      className="text-primary hover:bg-golden-metallic px-5 py-5
                        group-data-[collapsible=icon]:px-2
                        group-data-[collapsible=icon]:justify-center
                        data-[active=true]:bg-golden-dark
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
