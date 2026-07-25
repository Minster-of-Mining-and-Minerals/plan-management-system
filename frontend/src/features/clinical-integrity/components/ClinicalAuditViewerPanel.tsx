"use client";

import { ShieldCheck, User, Clock, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetAuditTrailQuery } from "@/redux/api/clinicalIntegrityApi";

type Props = {
  patientId?: string;
  domain?: string;
};

export function ClinicalAuditViewerPanel({ patientId, domain }: Props) {
  const { data: auditEvents = [] } = useGetAuditTrailQuery({ patient_id: patientId, domain });

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 bg-slate-50/60 dark:bg-slate-900/40 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <CardTitle className="text-sm font-semibold">
            Unified Clinical Audit Trail Viewer ({auditEvents.length})
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-0 text-xs">
        {auditEvents.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            No standardized clinical audit events logged.
          </div>
        ) : (
          <div className="divide-y">
            {auditEvents.map((evt) => (
              <div key={evt.id} className="p-3 flex items-start justify-between hover:bg-slate-50/50 space-x-2">
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Badge className="bg-slate-800 text-white text-[10px]">{evt.domain}</Badge>
                    <span>{evt.action}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" /> Actor: {evt.actor?.full_name || "System"} ({evt.actor_role || "User"})
                  </p>
                  {evt.reason && (
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 italic">
                      Reason: "{evt.reason}"
                    </p>
                  )}
                </div>

                <div className="text-right text-[11px] text-muted-foreground whitespace-nowrap">
                  <span className="flex items-center justify-end gap-1">
                    <Clock className="h-3 w-3" /> {new Date(evt.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
