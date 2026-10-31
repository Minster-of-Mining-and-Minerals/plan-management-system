"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useRouter, Link } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import {
  Building2,
  Users,
  Layers,
  ChevronLeft,
  ChevronRight,
  Shield,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { useGetRegionalStructureByIdQuery } from "@/redux/api/regionApi";
import { RegionalUserManagement } from "./RegionalUserManagement";
import { RegionalDepartmentManagement } from "./RegionalDepartmentManagement";
import type { ActionButton } from "@/types/tableLayout";
import { usePermissions } from "@/hooks/usePermissions";

interface RegionalDepartmentDetailProps {
  departmentId: string;
}

type TabType = "users" | "child_structures";

export function RegionalDepartmentDetail({ departmentId }: RegionalDepartmentDetailProps) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();
  const regionId = params?.id || session?.user?.region_id || "";

  const [activeTab, setActiveTab] = useState<TabType>("users");
  const { can } = usePermissions();

  const {
    data: structure,
    isLoading,
    isError,
    refetch,
  } = useGetRegionalStructureByIdQuery(departmentId, {
    skip: !departmentId,
  });

  // Side actions for switching tabs (Parity with Federal InternalStructureDetail)
  const sideActions: ActionButton[] = [
    {
      label: `Users (${structure?.users?.length || 0})`,
      icon: <Users className="h-4 w-4" />,
      variant: activeTab === "users" ? "default" : "outline",
      onClick: () => setActiveTab("users"),
    },
    {
      label: `Child Departments (${structure?.children?.length || 0})`,
      icon: <Layers className="h-4 w-4" />,
      variant: activeTab === "child_structures" ? "default" : "outline",
      onClick: () => setActiveTab("child_structures"),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4 bg-card p-6 rounded-2xl border shadow-sm">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !structure) {
    return (
      <div className="text-center py-16 space-y-4">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <h2 className="text-xl font-bold text-foreground">Department Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The requested regional department could not be located or may have been deleted.
        </p>
        <Button
          variant="outline"
          onClick={() => router.push(`/${regionId}/departments`)}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Return to Departments</span>
        </Button>
      </div>
    );
  }

  const isActive = structure.is_active !== false;

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb Card */}
      <div className="flex flex-col gap-4 bg-card p-6 rounded-2xl border shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary shrink-0 mt-1">
              <Building2 className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              {/* Breadcrumb Navigation */}
              <nav className="flex items-center space-x-1.5 text-xs text-muted-foreground">
                <Link
                  href={`/${regionId}/departments`}
                  className="hover:text-primary transition-colors font-medium"
                >
                  Regional Departments
                </Link>

                {structure.parent && (
                  <>
                    <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                    <Link
                      href={`/${regionId}/departments/${structure.parent.regional_structure_id || structure.parent_id}`}
                      className="hover:text-primary transition-colors font-medium"
                    >
                      {structure.parent.name}
                    </Link>
                  </>
                )}

                <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                <span className="text-foreground font-semibold truncate max-w-[200px]">
                  {structure.name}
                </span>
              </nav>

              {/* Title & Status */}
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {structure.name}
                </h1>
                <ActiveStatusBadge isActive={isActive} />
              </div>

              {/* Meta information */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono font-semibold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                  LEVEL {structure.level || 1}
                </span>
                <span>•</span>
                <span>REGIONAL DEPARTMENT</span>
                <span>•</span>
                <span className="font-medium">
                  {structure.region?.name || "Region Assigned"}
                </span>
              </div>

              {structure.description && (
                <p className="text-sm text-foreground/80 pt-1 leading-relaxed max-w-3xl">
                  {structure.description}
                </p>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${regionId}/departments`)}
            className="gap-1.5 shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>All Departments</span>
          </Button>
        </div>
      </div>

      {/* Content depending on selected tab */}
      {activeTab === "users" && (
        <RegionalUserManagement
          forced_regional_structure_id={departmentId}
          sideActions={sideActions}
          hideHeaderCard={true}
        />
      )}

      {activeTab === "child_structures" && (
        <RegionalDepartmentManagement
          forced_parent_id={departmentId}
          sideActions={sideActions}
          hideHeaderCard={true}
        />
      )}
    </div>
  );
}
export default RegionalDepartmentDetail;
