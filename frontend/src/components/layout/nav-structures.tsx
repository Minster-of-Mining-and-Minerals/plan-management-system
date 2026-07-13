"use client";

import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { ChevronRight, Building } from "lucide-react";
import {
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { GovernmentStructure } from "@/redux/types/governmentStructure";
import { SectorLogo, resolveSectorLogoPath } from "@/components/common/SectorLogo";
import { sidebarSubNavClasses } from "@/lib/branding/sidebarNavClasses";

interface NavStructuresProps {
  structures: GovernmentStructure[];
  structuresById?: Map<string, GovernmentStructure>;
  basePath: string;
}

export function NavStructures({ structures, structuresById, basePath }: NavStructuresProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Defer collapsible mount until after hydration to avoid Radix mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional client-only gate
    setMounted(true);
  }, []);

  const currentPath = pathname;

  const getStructureLogoPath = (structure: GovernmentStructure) => {
    const fromNode = resolveSectorLogoPath(structure.logo_path);
    if (fromNode) return fromNode;
    const id = structure.government_structure_id;
    if (!id || !structuresById) return null;
    return resolveSectorLogoPath(structuresById.get(id)?.logo_path);
  };

  const renderStructureIcon = (structure: GovernmentStructure) => {
    const logoPath = getStructureLogoPath(structure);
    if (logoPath) {
      return (
        <SectorLogo
          name={structure.name}
          logoPath={logoPath}
          size="xs"
          className="shrink-0"
        />
      );
    }
    return <Building className="h-4 w-4 shrink-0" aria-hidden />;
  };

  const renderStructure = (structure: GovernmentStructure) => {
    const url = `${basePath}/${structure.government_structure_id}`;
    const hasChildren = structure.children && structure.children.length > 0;
    const isActive = currentPath === url;
    const isChildActive = currentPath.startsWith(url) && !isActive;

    if (hasChildren) {
      if (!mounted) {
        return (
          <SidebarMenuSubItem key={structure.government_structure_id}>
            <SidebarMenuSubButton asChild isActive={isActive || isChildActive} className={sidebarSubNavClasses}>
                <Link href={url} className="flex items-center gap-4 w-full min-w-0">
                {renderStructureIcon(structure)}
                <span className="truncate flex-1 whitespace-nowrap">{structure.name}</span>
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        );
      }

      return (
        <SidebarMenuSubItem key={structure.government_structure_id}>
          <Collapsible
            defaultOpen={currentPath.startsWith(url)}
            className="group/collapsible"
          >
            <CollapsibleTrigger asChild>
              <SidebarMenuSubButton
                asChild
                isActive={isActive || isChildActive}
                className={sidebarSubNavClasses}
              >
                <Link href={url} className="flex items-center gap-4 w-full min-w-0">
                {renderStructureIcon(structure)}
                  <span className="truncate flex-1 whitespace-nowrap">{structure.name}</span>
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </Link>
              </SidebarMenuSubButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {structure.children?.map((child) => renderStructure(child))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuSubItem>
      );
    }

    return (
      <SidebarMenuSubItem key={structure.government_structure_id}>
        <SidebarMenuSubButton asChild isActive={isActive} className={sidebarSubNavClasses}>
          <Link href={url} className="flex items-center gap-4">
            {renderStructureIcon(structure)}
            <span className="truncate whitespace-nowrap">{structure.name}</span>
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  };

  if (structures.length === 0) {
    return (
      <SidebarMenuSub>
        <SidebarMenuSubItem>
          <span className="px-3 py-2 text-xs text-muted-foreground">
            No sectors yet
          </span>
        </SidebarMenuSubItem>
      </SidebarMenuSub>
    );
  }

  return (
    <SidebarMenuSub>
      {structures.map((structure) => renderStructure(structure))}
    </SidebarMenuSub>
  );
}
