"use client";

import { Info } from "lucide-react";

export function SpecialPermissionGroupGuidance() {
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 space-y-2">
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="font-medium">How special permission groups work</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              <strong>View sector plan hierarchy</strong> — members see the subtree rooted at
              nodes externally assigned to their sector (read-only oversight).
            </li>
            <li>
              <strong>View full plan hierarchy</strong> — members see the entire plan tree when
              they are linked to the plan (read-only oversight).
            </li>
            <li>
              <strong>Override parent achievement</strong> and <strong>edit finalized</strong>{" "}
              permissions apply only through these groups and are enforced on plan actions.
            </li>
          </ul>
          <p>
            Link one sector structure, then add departments under that sector. Users inherit
            special permissions through direct membership or their department.
          </p>
        </div>
      </div>
    </div>
  );
}
