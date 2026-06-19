"use client";

import { ShieldX, ArrowLeft, Home, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "@/i18n/navigation";
import type { PermissionRule } from "@/lib/permission-guard";
import {
  describePermissionRule,
  describePermissionRequirement,
  formatPermissionKey,
} from "@/utils/permissionRequirementUtils";

interface AccessDeniedProps {
  /** Path the user attempted to access */
  attemptedPath?: string;
  /** Where "Go back" / home actions should navigate */
  fallbackPath?: string;
  /** Matched route permission rule */
  permissionRule?: PermissionRule | null;
  /** Route pattern that matched, e.g. /plans/[id] */
  routePattern?: string;
  /** When false, required permissions are hidden (production default) */
  showRequiredPermissions?: boolean;
}

export function AccessDenied({
  attemptedPath,
  fallbackPath = "/dashboard",
  permissionRule,
  routePattern,
  showRequiredPermissions = false,
}: AccessDeniedProps) {
  const router = useRouter();
  const requirement = permissionRule ? describePermissionRule(permissionRule) : null;

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg border-destructive/20 shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Access denied</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              You don&apos;t have permission to view this page. Contact your administrator if
              you believe this is an error.
            </p>
            {attemptedPath && (
              <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded inline-block">
                {attemptedPath}
              </p>
            )}
          </div>

          {showRequiredPermissions && requirement && (
            <div className="w-full rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-left space-y-2">
              <div className="flex items-center gap-2 text-amber-900">
                <KeyRound className="h-4 w-4 shrink-0" />
                <p className="text-sm font-medium">Required permission</p>
              </div>
              {routePattern && (
                <p className="text-xs text-amber-800">
                  Route: <span className="font-mono">{routePattern}</span>
                </p>
              )}
              <p className="text-xs text-amber-800">{describePermissionRequirement(requirement)}</p>
              <div className="flex flex-wrap gap-1.5">
                {requirement.permissions.map((permission) => (
                  <Badge
                    key={permission}
                    variant="outline"
                    className="font-mono text-[10px] border-amber-300 bg-white text-amber-950"
                  >
                    {formatPermissionKey(permission)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go back
            </Button>
            <Button onClick={() => router.push(fallbackPath)}>
              <Home className="mr-2 h-4 w-4" />
              Go to home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
