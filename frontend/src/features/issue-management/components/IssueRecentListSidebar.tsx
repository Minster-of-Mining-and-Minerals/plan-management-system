"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IssueRecentListPanel } from "./IssueRecentListPanel";
import type { IssueListScope } from "@/redux/types/issue";

/** Matches app sidebar width transition (`sidebar.tsx`). */
const SIDEBAR_TRANSITION = "duration-200 ease-linear";

interface IssueRecentListSidebarProps {
  listScope: IssueListScope;
  className?: string;
}

export function IssueRecentListSidebar({ listScope, className }: IssueRecentListSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden transition-[width,max-height] ease-linear",
        SIDEBAR_TRANSITION,
        isOpen
          ? "w-full max-lg:max-h-[3000px] lg:w-80 xl:w-96"
          : "w-full max-lg:max-h-11 lg:w-16",
        className
      )}
    >
      {/* Desktop collapsed rail */}
      <div
        className={cn(
          "absolute inset-y-0 right-0 z-20 hidden w-16 flex-col items-center border-l bg-background pt-5 transition-opacity ease-linear lg:flex",
          SIDEBAR_TRANSITION,
          isOpen ? "pointer-events-none opacity-0" : "opacity-100"
        )}
      >
        <Button
          type="button"
          variant="ghost"
          onClick={() => setIsOpen(true)}
          title="Show recent issues"
          aria-label="Show recent issues"
          className="h-auto flex-col gap-2 px-2 py-3"
        >
          <ChevronLeft className="h-4 w-4 shrink-0 transition-transform ease-linear duration-200" />
          <Clock3 className="h-4 w-4 shrink-0" />
          <span className="text-[10px] font-semibold uppercase tracking-wide [writing-mode:vertical-rl] rotate-180">
            Recent
          </span>
        </Button>
      </div>

      {/* Expanded panel — fixed inner width so outer width animates smoothly */}
      <div
        className={cn(
          "relative w-full transition-[opacity,transform] ease-linear lg:w-80 xl:w-96",
          SIDEBAR_TRANSITION,
          isOpen
            ? "opacity-100 translate-x-0"
            : "pointer-events-none max-lg:-translate-y-2 max-lg:opacity-0 lg:translate-x-6 lg:opacity-0"
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(false)}
          title="Hide recent issues"
          aria-label="Hide recent issues"
          className={cn(
            "absolute -left-3 top-5 z-10 hidden h-7 w-7 rounded-full bg-background shadow-sm transition-opacity ease-linear lg:inline-flex",
            SIDEBAR_TRANSITION,
            isOpen ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          <ChevronRight className="h-4 w-4 transition-transform ease-linear duration-200" />
        </Button>

        <div className="lg:hidden flex justify-end mb-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="gap-2 text-muted-foreground"
          >
            <ChevronRight className="h-4 w-4" />
            Hide recent issues
          </Button>
        </div>

        <IssueRecentListPanel listScope={listScope} />
      </div>

      {/* Mobile collapsed toggle */}
      <div
        className={cn(
          "transition-opacity ease-linear lg:hidden",
          SIDEBAR_TRANSITION,
          isOpen ? "pointer-events-none opacity-0" : "opacity-100"
        )}
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="h-9 w-full gap-2"
        >
          <Clock3 className="h-4 w-4" />
          Show recent issues
        </Button>
      </div>
    </div>
  );
}
