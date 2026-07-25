"use client";

import { History, FileCode, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetRecordVersionsQuery } from "@/redux/api/clinicalIntegrityApi";

type Props = {
  entityType: string;
  entityId: string;
};

export function VersionHistoryViewerPanel({ entityType, entityId }: Props) {
  const { data: versions = [] } = useGetRecordVersionsQuery({ entity_type: entityType, entity_id: entityId });

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 bg-slate-50/60 dark:bg-slate-900/40 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-emerald-600" />
          <CardTitle className="text-sm font-semibold">
            Immutable Record Version History ({versions.length})
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-3">
        {versions.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No historical versions preserved for this record.
          </div>
        ) : (
          <div className="space-y-2">
            {versions.map((ver) => (
              <div key={ver.id} className="p-3 border rounded bg-slate-50/50 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge className="bg-emerald-600 text-white">Version v{ver.version_number}</Badge>
                  <span className="text-[11px] text-muted-foreground">
                    Modified by: {ver.modifier?.full_name || "Clinician"} ({new Date(ver.created_at).toLocaleString()})
                  </span>
                </div>
                {ver.change_reason && (
                  <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200">
                    Reason: {ver.change_reason}
                  </p>
                )}
                <pre className="p-2 bg-slate-900 text-slate-100 rounded text-[10px] overflow-x-auto">
                  {JSON.stringify(ver.snapshot_json, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
