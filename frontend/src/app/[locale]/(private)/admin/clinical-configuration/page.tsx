"use client";

import { UnifiedConfigurationCenter } from "@/features/governance/components/UnifiedConfigurationCenter";
import { ClinicalConfigurationCenter } from "@/features/governance/components/ClinicalConfigurationCenter";
import { ConfigurationDependencyViewer } from "@/features/governance/components/ConfigurationDependencyViewer";

export default function ClinicalConfigurationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Clinical Configuration Center
        </h1>
        <p className="text-xs text-muted-foreground">
          Enterprise Multi-Tenant Unified Order Definitions, Form Templates, Turnaround SLAs, and Governance Administration
        </p>
      </div>

      <UnifiedConfigurationCenter />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ClinicalConfigurationCenter />
        <ConfigurationDependencyViewer />
      </div>
    </div>
  );
}
