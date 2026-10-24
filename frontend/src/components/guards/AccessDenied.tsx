"use client";

import { ShieldX, ArrowLeft, Home, KeyRound, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "@/i18n/navigation";
import type { PermissionRule } from "@/lib/permission-guard";
import type { PermissionKey } from "@/lib/permissions";
import {
  describePermissionRule,
  getCanonicalPermissionCode,
  getPermissionHumanLabel,
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
  /** Current user's normalized effective permissions */
  userPermissions?: readonly PermissionKey[];
  /** Current user's assigned roles */
  userRoles?: readonly string[];
}

export function AccessDenied({
  attemptedPath,
  fallbackPath = "/dashboard",
  permissionRule,
  routePattern,
  showRequiredPermissions = false,
  userPermissions = [],
  userRoles = [],
}: AccessDeniedProps) {
  const router = useRouter();
  const requirement = permissionRule ? describePermissionRule(permissionRule) : null;
  const isUnmapped = permissionRule === null;

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-xl border-destructive/20 shadow-md">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight">Access Denied</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              You do not have permission to view this page or perform operations on this resource.
              Contact your system administrator if you believe this is an error.
            </p>
            {attemptedPath && (
              <p className="text-xs text-muted-foreground font-mono bg-muted px-2.5 py-1 rounded inline-block border">
                {attemptedPath}
              </p>
            )}
          </div>

          {showRequiredPermissions && (
            <div className="w-full rounded-xl border border-amber-300/80 bg-amber-50/90 dark:bg-amber-950/30 dark:border-amber-800 p-4 text-left space-y-3">
              <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-900 pb-2">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                  <KeyRound className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Test Mode: Authorization Diagnostics
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-amber-400 bg-amber-100/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200">
                  {routePattern || "Unregistered Route"}
                </Badge>
              </div>

              {isUnmapped ? (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-900 dark:bg-red-950/40 dark:border-red-900/60 dark:text-red-200 space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-xs text-red-700 dark:text-red-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Unmapped Route In Authorization Registry</span>
                  </div>
                  <p className="text-xs">
                    This route path has no matching rule in <code className="font-mono font-semibold">ROUTE_PERMISSION_RULES</code>.
                    Private routes default to strict denial unless explicitly registered with canonical permissions.
                  </p>
                </div>
              ) : requirement ? (
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-amber-900 dark:text-amber-200 text-xs">
                    <span>
                      Required Mode: <strong className="uppercase">{requirement.mode}</strong> (
                      {requirement.mode === "all"
                        ? "Must possess ALL listed permissions"
                        : requirement.mode === "any"
                        ? "Must possess AT LEAST ONE listed permission"
                        : "Must possess EXACTLY these permissions"}
                      )
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {requirement.permissions.map((perm) => {
                      const canonicalCode = getCanonicalPermissionCode(perm);
                      const humanLabel = getPermissionHumanLabel(perm);
                      const hasPerm = userPermissions.includes(canonicalCode as PermissionKey);

                      return (
                        <div
                          key={canonicalCode}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                            hasPerm
                              ? "bg-emerald-50/80 border-emerald-200 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-200"
                              : "bg-rose-50/80 border-rose-200 text-rose-950 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-200"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="font-mono font-bold tracking-tight">{canonicalCode}</div>
                            {humanLabel && (
                              <div className="text-[11px] opacity-80">{humanLabel}</div>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={`flex items-center gap-1 font-mono text-[10px] uppercase font-bold shrink-0 ${
                              hasPerm
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200"
                                : "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/60 dark:text-rose-200"
                            }`}
                          >
                            {hasPerm ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" /> Present
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3" /> Missing
                              </>
                            )}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {userRoles.length > 0 && (
                <div className="pt-2 border-t border-amber-200/80 dark:border-amber-900/60 flex flex-wrap items-center gap-1.5 text-[11px] text-amber-900 dark:text-amber-200">
                  <span className="font-semibold">Assigned Roles:</span>
                  {userRoles.map((role) => (
                    <Badge
                      key={role}
                      variant="outline"
                      className="text-[10px] font-medium border-amber-300 bg-white/80 dark:bg-amber-900/30 text-amber-950 dark:text-amber-100"
                    >
                      {role}
                    </Badge>
                  ))}
                </div>
              )}
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

