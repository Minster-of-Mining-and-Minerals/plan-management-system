"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  FileText,
  ChevronRight,
  Shield,
  Key,
  FolderTree,
} from "lucide-react";

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
} from "@/components/ui/collapsible"
import Image from "next/image";

// Navigation items
const navigationItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Evaluations",
    url: "/evaluations",
    icon: ClipboardCheck,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: FileText,
  },
];

// Nested menu for User Management
const userManagementItems = [
  {
    title: "User List",
    url: "/users/list",
    icon: Users,
  },
  {
    title: "Role Management",
    url: "/users/roles",
    icon: Shield,
  },
  {
    title: "Permission Management",
    url: "/users/permissions",
    icon: Key,
  },
];

// Nested menu for Structure Management
const structureManagementItems = [
  {
    title: "Government Structure",
    url: "/structures/government",
    icon: FolderTree,
  },
  {
    title: "Internal Structure",
    url: "/structures/internal",
    icon: FolderTree,
  },
];

const stripLocale = (pathname: string) => {
  const segments = pathname.split("/");
  if (segments.length > 1 && ["en", "am"].includes(segments[1])) {
    return "/" + segments.slice(2).join("/");
  }
  return pathname;
};

export function AppSidebar() {
  const rawPathname = usePathname();
  const pathname = stripLocale(rawPathname);

  return (
    <Sidebar collapsible="icon" variant="floating" className="">
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
                  Plan and Evaluation System
                </span>
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-5 group-data-[collapsible=icon]:px-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-2 group-data-[collapsible=icon]:items-center">
              {navigationItems.map((item) => (
                <SidebarMenuItem
                  key={item.title}
                  className="group-data-[collapsible=icon]:w-fit"
                >
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className="text-primary hover:bg-golden-dark20 px-5 py-5 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center data-[active=true]:bg-golden-dark data-[active=true]:text-primary-foreground"
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
              ))}

              {/* Users with nested menu */}
              <Collapsible asChild defaultOpen={pathname.startsWith("/users")} className="group/collapsible">
                <SidebarMenuItem className="group-data-[collapsible=icon]:w-fit">
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip="Users"
                      isActive={pathname.startsWith("/users")}
                      className="text-primary hover:bg-golden-metallic px-5 py-5 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center data-[active=true]:bg-golden-dark data-[active=true]:text-primary-foreground"
                    >
                      <Users className="group-data-[collapsible=icon]:size-5" />
                      <span className="text-base group-data-[collapsible=icon]:hidden">User Management</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {userManagementItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === subItem.url}
                            className="text-primary hover:bg-golden-metallic group-data-[collapsible=icon]:justify-center data-[active=true]:bg-golden-metallic data-[active=true]:text-primary"
                          >
                            <Link href={subItem.url}>
                              <subItem.icon className="h-4 w-4" />
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Structures with nested menu */}
              <Collapsible asChild defaultOpen={pathname.startsWith("/structures")} className="group/collapsible">
                <SidebarMenuItem className="group-data-[collapsible=icon]:w-fit">
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip="Structures"
                      isActive={pathname.startsWith("/structures")}
                      className="text-primary hover:bg-golden-metallic px-5 py-5 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center data-[active=true]:bg-golden-dark data-[active=true]:text-primary-foreground"
                    >
                      <FolderTree className="group-data-[collapsible=icon]:size-5" />
                      <span className="text-base group-data-[collapsible=icon]:hidden">Structure Management</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {structureManagementItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === subItem.url}
                            className="text-primary hover:bg-golden-metallic group-data-[collapsible=icon]:justify-center data-[active=true]:bg-golden-metallic data-[active=true]:text-primary"
                          >
                            <Link href={subItem.url}>
                              <subItem.icon className="h-4 w-4" />
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}