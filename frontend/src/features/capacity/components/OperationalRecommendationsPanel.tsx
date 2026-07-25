"use client";

import { Lightbulb, CheckCircle2, AlertOctagon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetRecommendationsQuery, useAcceptRecommendationMutation, type OperationalRecommendation } from "@/redux/api/capacityApi";

export function OperationalRecommendationsPanel() {
  const { data: recommendations = [], isLoading } = useGetRecommendationsQuery();
  const [acceptRecommendation] = useAcceptRecommendationMutation();

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-sm font-semibold">Operational Recommendations Engine</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 text-xs space-y-2 max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground animate-pulse">Generating recommendations...</div>
        ) : recommendations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No operational recommendations at this time.</div>
        ) : (
          recommendations.map((rec: OperationalRecommendation) => (
            <div key={rec.id} className="p-2.5 border rounded space-y-1.5 hover:bg-slate-50/50">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[9px] ${rec.priority === "CRITICAL" ? "bg-red-600 text-white" : rec.priority === "HIGH" ? "bg-amber-500 text-white" : "bg-blue-500 text-white"}`}>
                      {rec.priority}
                    </Badge>
                    <span className="font-semibold text-[11px]">{rec.title}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{rec.reason}</p>
                  <div className="text-[9px] text-emerald-600 font-medium">Benefit: {rec.expected_benefit}</div>
                </div>
                <Button size="sm" variant="outline" className="h-6 text-[9px] shrink-0" onClick={() => acceptRecommendation(rec.id)}>
                  <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> Apply
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
