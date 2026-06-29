"use client";

import { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type SpecialPermissionGroupGuidanceProps = {
  defaultOpen?: boolean;
};

export function SpecialPermissionGroupGuidance({
  defaultOpen = false,
}: SpecialPermissionGroupGuidanceProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border border-violet-200 bg-violet-50 text-violet-900"
    >
      <CollapsibleTrigger
        type="button"
        className="flex w-full items-start gap-3 px-4 py-3 text-left text-sm hover:bg-violet-100/60 rounded-lg transition-colors"
      >
        <BookOpen className="h-4 w-4 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="font-semibold text-violet-950">
            Guide for administrators &amp; members joining this group
          </p>
          <p className="text-xs text-violet-800/90 font-normal">
            Keep this handy when onboarding new users or departments over time.
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 mt-0.5 text-violet-700 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4 pt-0">
        <div className="ml-7 space-y-3 text-sm border-t border-violet-200/80 pt-3">
          <p>
            Special permission groups grant governance capabilities that standard groups
            cannot. Members receive permissions through direct assignment or their department.
          </p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li>
              <strong>View sector plan hierarchy</strong> — see the subtree rooted at nodes
              externally assigned to the member&apos;s sector (read-only oversight).
            </li>
            <li>
              <strong>View full plan hierarchy</strong> — see the entire plan tree when linked
              to the plan (read-only oversight).
            </li>
            <li>
              <strong>Override parent achievement</strong> and related governance permissions
              apply only through these groups and are enforced on plan actions.
            </li>
          </ul>
          <p>
            <strong>Setup order:</strong> link exactly one sector structure, add departments
            under that sector, then add users directly or via those departments.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
