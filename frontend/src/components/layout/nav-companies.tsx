"use client";

import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { Building2, LayoutGrid } from "lucide-react";
import Image from "next/image";
import {
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import type { Company } from "@/redux/types/company";
import { getFileUrl } from "@/utils/fileUrl";
import { sidebarSubNavClasses } from "@/lib/branding/sidebarNavClasses";

interface NavCompaniesProps {
  companies: Company[];
  basePath?: string;
}

export function NavCompanies({ companies, basePath = "/admin/companies" }: NavCompaniesProps) {
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
      {/* Companies List navigation */}
      <SidebarMenuSubItem>
        <SidebarMenuSubButton
          asChild
          isActive={currentPath === basePath}
          className={sidebarSubNavClasses}
        >
          <Link
            href={basePath}
            className="flex items-center gap-3 w-full min-w-0"
            title="Companies List"
          >
            <LayoutGrid className="h-4 w-4 shrink-0 text-primary/70" aria-hidden />
            <span className="truncate flex-1 whitespace-nowrap font-medium">Companies List</span>
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>

      {/* Individual Company sub-items */}
      {companies.map((company) => {
        const url = `${basePath}/${company.company_id}`;
        const isActive = currentPath === url || currentPath.startsWith(`${url}/`);
        const logoUrl = company.logo_path ? getFileUrl(company.logo_path) : null;

        return (
          <SidebarMenuSubItem key={company.company_id}>
            <SidebarMenuSubButton
              asChild
              isActive={isActive}
              className={sidebarSubNavClasses}
            >
              <Link
                href={url}
                className="flex items-center gap-3 w-full min-w-0"
                title={`${company.name} (${company.code})`}
              >
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={company.name}
                    width={16}
                    height={16}
                    className="h-4 w-4 shrink-0 rounded-sm object-contain"
                    unoptimized
                  />
                ) : (
                  <Building2 className="h-4 w-4 shrink-0 text-primary/70" aria-hidden />
                )}
                <span className="truncate flex-1 whitespace-nowrap">{company.name}</span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground shrink-0 uppercase">
                  {company.code}
                </span>
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        );
      })}
    </SidebarMenuSub>
  );
}
