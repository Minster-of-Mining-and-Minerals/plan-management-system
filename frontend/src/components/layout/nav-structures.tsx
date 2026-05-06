"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

interface NavStructuresProps {
  structures: GovernmentStructure[];
  basePath: string;
}

export function NavStructures({ structures, basePath }: NavStructuresProps) {
  const pathname = usePathname();

  const stripLocale = (path: string) => {
    const segments = path.split("/");
    if (segments.length > 1 && ["en", "am"].includes(segments[1])) {
      return "/" + segments.slice(2).join("/");
    }
    return path;
  };

  const currentPath = stripLocale(pathname);

  const renderStructure = (structure: GovernmentStructure) => {
    const url = `${basePath}/${structure.government_structure_id}`;
    const hasChildren = structure.children && structure.children.length > 0;
    const isActive = currentPath === url;
    const isChildActive = currentPath.startsWith(url) && !isActive;

    if (hasChildren) {
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
              >
                <Link href={url} className="flex items-center gap-4 w-full min-w-0">
                  <Building className="h-4 w-4 shrink-0" />
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
        <SidebarMenuSubButton asChild isActive={isActive}>
          <Link href={url} className="flex items-center gap-4">
            <Building className="h-4 w-4 shrink-0" />
            <span className="truncate whitespace-nowrap">{structure.name}</span>
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  };

  return (
    <SidebarMenuSub>
      {structures.map((structure) => renderStructure(structure))}
    </SidebarMenuSub>
  );
}
