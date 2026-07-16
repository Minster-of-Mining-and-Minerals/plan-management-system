"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetPlanVersionByIdQuery } from "@/redux/api/planApi";
import { AnnualTargetRevisionForm } from "./AnnualTargetRevisionForm";
import { AnnualTargetRevisionRequestTable } from "./AnnualTargetRevisionRequestTable";

type AnnualTargetRevisionSectionProps = {
  draftId: string;
  annualVersionId: string;
  className?: string;
};

function resolveLiveVersionId(
  version: { execution_snapshot_of_version_id?: string | null } | null | undefined,
  fallbackId: string
): string {
  return version?.execution_snapshot_of_version_id || fallbackId;
}

export function AnnualTargetRevisionSection({
  draftId,
  annualVersionId,
  className,
}: AnnualTargetRevisionSectionProps) {
  const searchParams = useSearchParams();
  const focusRevision = searchParams.get("focus") === "annual-target-revision";
  const sectionRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!focusRevision) return;
    setExpanded(true);
    const timer = window.setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [focusRevision]);

  const { data: draftVersion } = useGetPlanVersionByIdQuery(draftId, {
    skip: !draftId,
  });
  const liveDraftId =
    draftVersion?.live_master_version_id ||
    draftVersion?.execution_snapshot_of_version_id ||
    draftId;

  const { data: annualVersion } = useGetPlanVersionByIdQuery(annualVersionId, {
    skip: !annualVersionId,
  });
  const liveAnnualVersionId = resolveLiveVersionId(
    annualVersion,
    annualVersionId
  );

  return (
    <div
      ref={sectionRef}
      id="annual-target-revision-section"
      className={cn(
        "rounded-lg border border-amber-200 bg-amber-50/70 text-amber-950",
        focusRevision && "ring-2 ring-amber-400/70",
        className
      )}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium"
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <Target className="h-4 w-4 shrink-0" />
        <span>Annual Target Revision</span>
      </button>

      {expanded && (
        <div className="space-y-5 border-t border-amber-200/80 px-4 py-4">
          <div>
            <p className="text-sm font-medium">Request a revision</p>
            <p className="mt-1 text-xs text-amber-900/80">
              Revise the effective annual target and redistribute remaining open
              periods. Completed periods stay unchanged. Original baseline is
              preserved for reporting.
            </p>
            <div className="mt-3">
              <AnnualTargetRevisionForm
                draftId={liveDraftId}
                annualVersionId={liveAnnualVersionId}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Requests</p>
            <AnnualTargetRevisionRequestTable draftId={liveDraftId} />
          </div>
        </div>
      )}
    </div>
  );
}
