"use client";

import { Award, Clock, User as UserIcon } from "lucide-react";
import type { PlanDashboardFiltersState } from "../hooks/usePlanDashboardFilters";
import { PerformanceBadge } from "../components/StatusBadge";

interface UserTabProps {
  state: PlanDashboardFiltersState;
}

export function UserTab({ state }: UserTabProps) {
  const users = state.filteredUsers;
  const topPerformers = [...users]
    .sort((a, b) => b.activityScore - a.activityScore)
    .slice(0, 3);

  const getStructureName = (id: string) =>
    state.data.structures.find((s) => s.id === id)?.name ?? "—";
  const getDepartmentName = (id: string) =>
    state.data.departments.find((d) => d.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-golden-dark">User Performance</h2>
        <p className="text-sm text-muted-foreground">
          Individual assignee coverage from internal plan assignments.
        </p>
      </div>

      {topPerformers.length > 0 && (
        <section className="rounded-xl border bg-gradient-to-br from-golden-dark/10 to-white p-5 space-y-3">
          <div className="flex items-center gap-2 text-golden-dark font-semibold">
            <Award className="h-4 w-4" />
            Top Performers
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topPerformers.map((user, i) => (
              <div
                key={user.id}
                className="rounded-lg border bg-white p-4 flex items-center gap-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-bold text-sm">
                  #{i + 1}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Score: {user.activityScore}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/80">
                <th className="px-4 py-3 text-left font-semibold text-golden-dark">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-golden-dark">Role</th>
                <th className="px-4 py-3 text-left font-semibold text-golden-dark">Department</th>
                <th className="px-4 py-3 text-left font-semibold text-golden-dark">Structure</th>
                <th className="px-4 py-3 text-left font-semibold text-golden-dark">Performance</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-gray-100 p-1.5">
                        <UserIcon className="h-3.5 w-3.5 text-golden-dark" />
                      </div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.role}</td>
                  <td className="px-4 py-3">{getDepartmentName(user.departmentId)}</td>
                  <td className="px-4 py-3">{getStructureName(user.structureId)}</td>
                  <td className="px-4 py-3">
                    <PerformanceBadge level={user.performance} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <p className="p-8 text-center text-muted-foreground">No users match filters.</p>
        )}
      </div>

      <div className="rounded-xl border border-dashed bg-gray-50/50 p-8">
        <div className="flex items-center gap-2 text-muted-foreground mb-4">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">Activity Timeline (Placeholder)</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-2 rounded-full bg-primary/20" />
              <div className="flex-1 rounded-lg border bg-white p-3 text-sm text-muted-foreground">
                Activity event #{i} — connect to audit / action log API
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
