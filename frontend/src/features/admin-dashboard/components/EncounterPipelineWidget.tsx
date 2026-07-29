import React from "react";
import { PipelineStage } from "../../../redux/api/dashboardApi";

interface EncounterPipelineWidgetProps {
  pipeline: PipelineStage[];
  totalActive: number;
  bottleneckStage: string;
}

export const EncounterPipelineWidget: React.FC<EncounterPipelineWidgetProps> = ({
  pipeline,
  totalActive,
  bottleneckStage,
}) => {
  return (
    <div className="bg-card text-card-foreground p-5 rounded-xl border border-border shadow-sm mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <span>⚡ Real-Time Encounter Pipeline Command Stage</span>
            <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-semibold">
              Live Pipeline ({totalActive} Active)
            </span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Stage progress tracking from registration to discharge with live wait times and SLA bottleneck detection.
          </p>
        </div>
        {bottleneckStage !== "None" && (
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive text-xs px-3 py-1.5 rounded-md font-medium border border-destructive/20 animate-pulse">
            <span>⚠️ Bottleneck Detected:</span>
            <strong className="underline">{bottleneckStage}</strong>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {pipeline.map((stage, idx) => (
          <div
            key={stage.id || idx}
            className={`p-3 rounded-lg border flex flex-col justify-between transition-all hover:shadow-md ${
              stage.bottleneck
                ? "bg-destructive/5 border-destructive/40"
                : stage.sla_status === "WARNING"
                ? "bg-amber-500/5 border-amber-500/30"
                : "bg-muted/30 border-border"
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold mb-1">
                <span>Stage {idx + 1}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded ${
                    stage.bottleneck
                      ? "bg-destructive text-white"
                      : stage.sla_status === "WARNING"
                      ? "bg-amber-500 text-white"
                      : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {stage.sla_status}
                </span>
              </div>
              <h4 className="text-xs font-bold truncate">{stage.name}</h4>
              <div className="text-2xl font-black mt-1 text-foreground">
                {stage.count}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-border/50 text-[11px] text-muted-foreground space-y-0.5">
              <div className="flex justify-between">
                <span>Avg Wait:</span>
                <strong className="text-foreground">{stage.avg_wait_min}m</strong>
              </div>
              {stage.longest_wait_patient !== "N/A" && (
                <div className="truncate text-[10px] text-amber-600 dark:text-amber-400 font-mono mt-1" title={stage.longest_wait_patient}>
                  ⏱️ {stage.longest_wait_patient}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EncounterPipelineWidget;
