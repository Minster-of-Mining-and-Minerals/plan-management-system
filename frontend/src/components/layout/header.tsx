"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { NavUser } from "./nav-user";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/hooks/use-auth";

interface HeaderProps {
  title?: string;
  showSidebar?: boolean;
  notificationsHref?: string;
  notificationCount?: number;
}

export function Header({
  title,
  showSidebar = true,
  notificationsHref,
  notificationCount = 0,
}: HeaderProps) {
  const { user, session } = useAuth();

  const userData = {
    name: user?.full_name || session?.user?.name || "User",
    email: user?.email || session?.user?.email || "",
    avatar: user?.profile_image || session?.user?.image || undefined,
  };

  return (
    <header className="flex z-30 sticky shadow-md top-2 border h-16 shrink-0 items-center gap-2 px-4 rounded-xl bg-sidebar text-sidebar-foreground m-2 mb-0">
      {showSidebar && <SidebarTrigger className="-ml-1" />}
      {title && <h1 className="text-lg font-semibold">{title}</h1>}
      <div className="ml-auto flex items-center gap-2">
        {notificationsHref ? (
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href={notificationsHref}>
              <Bell className="size-5" />
              {notificationCount > 0 && (
                <span className="absolute text-white font-bold -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
              <span className="sr-only">Notifications</span>
            </Link>
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="relative" disabled>
            <Bell className="size-5" />
            <span className="sr-only">Notifications</span>
          </Button>
        )}
        <NavUser user={userData} />
      </div>
    </header>
  );
}