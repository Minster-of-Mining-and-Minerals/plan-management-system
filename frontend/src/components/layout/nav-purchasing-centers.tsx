"use client";

import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { Building2 } from "lucide-react";
import Image from "next/image";
import {
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import type { PurchasingCenter } from "@/redux/types/purchasingCenter";
import { getFileUrl } from "@/utils/fileUrl";
import { sidebarSubNavClasses } from "@/lib/branding/sidebarNavClasses";

interface NavPurchasingCentersProps {
  centers: PurchasingCenter[];
  basePath?: string;
}

export function NavPurchasingCenters({
  centers,
  basePath = "/admin/purchasing-centers",
}: NavPurchasingCentersProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only gate
    setMounted(true);
  }, []);

  const currentPath = pathname;

  if (!mounted) {
    return null;
  }

  return (
    <SidebarMenuSub className="pt-1">
      {/* Individual Purchasing Center sub-items */}
      {centers.map((center) => {
        const url = `${basePath}/${center.purchasing_center_id}`;
        const isActive = currentPath === url || currentPath.startsWith(`${url}/`);
        const logoUrl = center.logo_path ? getFileUrl(center.logo_path) : null;

        return (
          <SidebarMenuSubItem key={center.purchasing_center_id}>
            <SidebarMenuSubButton
              asChild
              isActive={isActive}
              className={sidebarSubNavClasses}
            >
              <Link
                href={url}
                className="flex items-center gap-3 w-full min-w-0"
                title={`${center.name} (${center.code})`}
              >
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={center.name}
                    width={16}
                    height={16}
                    className="h-4 w-4 shrink-0 rounded-sm object-contain"
                    unoptimized
                  />
                ) : (
                  <Building2 className="h-4 w-4 shrink-0 text-primary/70" aria-hidden />
                )}
                <span className="truncate flex-1 whitespace-nowrap">{center.name}</span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground shrink-0 uppercase">
                  {center.code}
                </span>
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        );
      })}
    </SidebarMenuSub>
  );
}
