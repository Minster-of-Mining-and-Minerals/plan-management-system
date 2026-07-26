"use client";

import React from "react";
import { useTenant } from "@/providers/TenantProvider";

export function FacilitySelector() {
  const { activeFacility, assignments, setActiveFacility, isLoading } = useTenant();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-xs text-slate-500 animate-pulse">
        <span>Loading facilities...</span>
      </div>
    );
  }

  if (!assignments || assignments.length === 0) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
        <span className="font-medium">Default Facility</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="facility-selector" className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline-block">
        Facility:
      </label>
      <select
        id="facility-selector"
        value={activeFacility?.facility_id || ""}
        onChange={(e) => {
          const selected = assignments.find((a) => a.facility_id === e.target.value);
          if (selected?.facility) {
            setActiveFacility(selected.facility);
          }
        }}
        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
      >
        {assignments.map((assignment) => (
          <option key={assignment.assignment_id} value={assignment.facility_id}>
            {assignment.facility?.name || `Facility (${assignment.facility_id.slice(0, 6)})`} — {assignment.role_name}
          </option>
        ))}
      </select>
    </div>
  );
}
