"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { NavUser } from "./nav-user";
import { useAuth } from "@/hooks/use-auth";
import TemplateNotificationDropdown from "@/features/notifications/TemplateNotificationDropdown";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { user } = useAuth();

  const userData = {
    name: user?.full_name || "Guest",
    email: user?.email || "",
    avatar: user?.profile_image || undefined,
  };

  return (
    <header className="flex z-30 sticky shadow-md top-2 border h-16 shrink-0 items-center gap-2 px-4 rounded-xl bg-header text-sidebar-foreground m-2 mb-0">
      <SidebarTrigger className="-ml-1" />
      {title && <h1 className="text-lg font-semibold">{title}</h1>}
      <div className="ml-auto flex items-center gap-2">
        <TemplateNotificationDropdown />
        <NavUser user={userData} />
      </div>
    </header>
  );
}
