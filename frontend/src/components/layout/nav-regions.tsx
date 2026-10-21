"use client";

import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { Globe, LayoutGrid } from "lucide-react";
import Image from "next/image";
import {
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import type { Region } from "@/redux/types/region";
import { getFileUrl } from "@/utils/fileUrl";
import { sidebarSubNavClasses } from "@/lib/branding/sidebarNavClasses";

interface NavRegionsProps {
  regions: Region[];
  basePath?: string;
}

export function NavRegions({ regions, basePath = "/admin/regions" }: NavRegionsProps) {
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
      {/* Individual Region sub-items */}
      {regions.map((region) => {
        const url = `${basePath}/${region.region_id}`;
        const isActive = currentPath === url || currentPath.startsWith(`${url}/`);
        const logoUrl = region.logo_path ? getFileUrl(region.logo_path) : null;

        return (
          <SidebarMenuSubItem key={region.region_id}>
            <SidebarMenuSubButton
              asChild
              isActive={isActive}
              className={sidebarSubNavClasses}
            >
              <Link
                href={url}
                className="flex items-center gap-3 w-full min-w-0"
                title={`${region.name} (${region.code})`}
              >
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={region.name}
                    width={16}
                    height={16}
                    className="h-4 w-4 shrink-0 rounded-sm object-contain"
                    unoptimized
                  />
                ) : (
                  <Globe className="h-4 w-4 shrink-0 text-primary/70" aria-hidden />
                )}
                <span className="truncate flex-1 whitespace-nowrap">{region.name}</span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground shrink-0 uppercase">
                  {region.code}
                </span>
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        );
      })}
    </SidebarMenuSub>
  );
}
