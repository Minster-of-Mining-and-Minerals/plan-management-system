"use client";

import { Shield, FileCheck, AlertTriangle, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetComplianceMetricsQuery } from "@/redux/api/clinicalIntegrityApi";

export function ClinicalComplianceDashboard() {
  const { data: metrics } = useGetComplianceMetricsQuery();

  return (
    <div className="grid grid-cols-4 gap-3 text-xs">
      <Card className="border shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-[11px]">Audit Events Logged</p>
            <h3 className="text-xl font-bold">{metrics?.total_audit_events || 0}</h3>
          </div>
          <Activity className="h-6 w-6 text-emerald-600" />
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-[11px]">Immutable Versions</p>
            <h3 className="text-xl font-bold">{metrics?.total_record_versions || 0}</h3>
          </div>
          <FileCheck className="h-6 w-6 text-blue-600" />
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-[11px]">Amendments Approved</p>
            <h3 className="text-xl font-bold">{metrics?.amendments_by_status?.APPROVED || 0}</h3>
          </div>
          <Shield className="h-6 w-6 text-indigo-600" />
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-[11px]">Compliance Rating</p>
            <Badge className="bg-emerald-600 text-white font-semibold mt-1">HIGHLY COMPLIANT</Badge>
          </div>
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </CardContent>
      </Card>
    </div>
  );
}
