"use client";

import { GitCommit, ArrowRight, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useGetDependencyTreeQuery,
  type DependencyNode,
} from "@/redux/api/clinicalConfigurationGovernanceApi";

interface ConfigurationDependencyViewerProps {
  entityCode?: string;
}

export function ConfigurationDependencyViewer({ entityCode = "CBC_TEST" }: ConfigurationDependencyViewerProps) {
  const { data } = useGetDependencyTreeQuery({ entity_code: entityCode });
  const hierarchy: DependencyNode[] = Array.isArray(data?.hierarchy)
    ? data.hierarchy
    : Array.isArray(data)
    ? (data as any)
    : [];

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <CardTitle className="text-sm font-semibold">Configuration Dependency Viewer ({entityCode})</CardTitle>
          </div>
          <Badge variant="outline" className="text-[9px]">Hierarchy Graph</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-2">
        {hierarchy.map((node: DependencyNode, idx: number) => (
          <div key={idx} className="flex items-center gap-2 p-1.5 border rounded bg-slate-50/50 text-[10px]">
            <GitCommit className="h-3 w-3 text-indigo-600" />
            <span className="font-semibold">{node.type}</span>: {node.name}
            {idx < hierarchy.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto" />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
