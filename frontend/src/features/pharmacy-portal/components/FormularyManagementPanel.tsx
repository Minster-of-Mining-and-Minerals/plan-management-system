"use client";

import { Building2, Shield, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useListFormularyRulesQuery } from "@/redux/api/pharmacyEnterpriseApi";

export function FormularyManagementPanel() {
  const { data: rules = [] } = useListFormularyRulesQuery();

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 bg-slate-50/60 dark:bg-slate-900/40 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-emerald-600" />
          <CardTitle className="text-sm font-semibold">
            Hospital Medication Formulary & Policy Rules ({rules.length})
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-0 text-xs">
        {rules.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            No department restriction or hospital policy rules defined.
          </div>
        ) : (
          <div className="divide-y border-b">
            {rules.map((rule) => (
              <div key={rule.id} className="p-3 flex items-center justify-between hover:bg-slate-50/50">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {rule.medicationCatalog?.generic_name || "Medication Item"}
                    {rule.requires_approval && (
                      <Badge className="bg-amber-100 text-amber-800 text-[10px]">Requires Approval</Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Restricted Departments: {rule.department_restriction || "All Hospital Departments"}
                  </div>
                </div>

                {rule.preferredAlternative && (
                  <div className="text-right text-[11px]">
                    <span className="text-muted-foreground">Preferred Alt:</span>{" "}
                    <span className="font-semibold text-emerald-700">{rule.preferredAlternative.generic_name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
