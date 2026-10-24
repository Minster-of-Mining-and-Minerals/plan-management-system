"use client";

import { useState } from "react";
import {
  Settings,
  Calendar,
  Clock,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import Loading01 from "@/features/template/component/Loading/Loading01";

import {
  useGetFrequenciesQuery,
  useCreateFrequencyMutation,
  useUpdateFrequencyMutation,
  useGetTargetPeriodsQuery,
} from "@/redux/api/productionApi";
import type { ProductionReportingFrequency } from "@/redux/types/production";

export function ProductionFrequenciesView() {
  const { data: frequencies = [], isLoading, isError, refetch } = useGetFrequenciesQuery();
  const [createFrequency, { isLoading: isCreating }] = useCreateFrequencyMutation();
  const [updateFrequency] = useUpdateFrequencyMutation();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [intervalDays, setIntervalDays] = useState("30");
  const [description, setDescription] = useState("");
  const [calendarBasis, setCalendarBasis] = useState("gregorian");
  const [formError, setFormError] = useState("");

  // Sandbox Simulator State
  const [simYear, setSimYear] = useState<number>(new Date().getFullYear());
  const [simDepth, setSimDepth] = useState<string>("quarterly");

  const { data: simulatedPeriods = [], isLoading: isSimLoading } = useGetTargetPeriodsQuery(
    { year: simYear, allocationDepth: simDepth }
  );

  const handleCreateFrequency = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim() || !code.trim()) {
      setFormError("Frequency Name and Code are required.");
      return;
    }

    try {
      await createFrequency({
        name: name.trim(),
        code: code.trim().toLowerCase(),
        interval_days: parseInt(intervalDays, 10) || null,
        description: description.trim() || undefined,
        calendar_basis: calendarBasis,
      }).unwrap();

      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      setFormError(err.data?.message || err.message || "Failed to create frequency.");
    }
  };

  const handleToggleActive = async (freq: ProductionReportingFrequency) => {
    try {
      await updateFrequency({
        id: freq.frequency_id,
        data: { is_active: !freq.is_active },
      }).unwrap();
      refetch();
    } catch (err: any) {
      alert(err.data?.message || err.message || "Failed to update frequency status.");
    }
  };

  const columns: ColumnDef<ProductionReportingFrequency>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-foreground">{row.original.name}</div>
          {row.original.description && (
            <span className="block text-[11px] text-muted-foreground mt-0.5">
              {row.original.description}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.code}</span>,
    },
    {
      accessorKey: "interval_days",
      header: "Interval (Days)",
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.interval_days ? `${row.original.interval_days} days` : "Calendar-based"}
        </span>
      ),
    },
    {
      accessorKey: "calendar_basis",
      header: "Calendar",
      cell: ({ row }) => (
        <span className="capitalize text-xs text-muted-foreground">{row.original.calendar_basis}</span>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => <ActiveStatusBadge isActive={row.original.is_active} />,
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleActive(row.original)}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            {row.original.is_active ? "Deactivate" : "Activate"}
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <Loading01 />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-white/20 p-2 backdrop-blur-sm">
                <Clock className="h-6 w-6 text-white" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight">
                Reporting Frequencies & Period Engine
              </h1>
            </div>
            <p className="mt-1 text-sm text-blue-100">
              Manage dynamic reporting cadences and test period generation boundaries.
            </p>
          </div>
          <Button
            onClick={() => {
              setName("");
              setCode("");
              setIntervalDays("30");
              setDescription("");
              setCalendarBasis("gregorian");
              setFormError("");
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white shadow-md font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Frequency
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Frequencies Registry (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Settings className="h-5 w-5 text-indigo-500" />
                Configured Reporting Frequencies
              </h3>
              <Badge variant="secondary">{frequencies.length} Available</Badge>
            </div>

            <DataTable
              columns={columns}
              data={frequencies}
              isLoading={isLoading}
              isError={isError}
              errorMessage="Failed to load frequencies."
              onRetry={refetch}
            />
          </div>
        </div>

        {/* Right: Dynamic Period Generation Simulator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-teal-600" />
                Dynamic Period Generator
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Preview dynamic period boundaries based on year and allocation depth.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border">
              <div>
                <label className="block text-xs font-medium mb-1">Target Year</label>
                <Input
                  type="number"
                  value={simYear}
                  onChange={(e) => setSimYear(parseInt(e.target.value, 10) || 2026)}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Allocation Depth</label>
                <select
                  value={simDepth}
                  onChange={(e) => setSimDepth(e.target.value)}
                  className="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="annual">Annual Only</option>
                  <option value="semi_annual">Semiannual (H1, H2)</option>
                  <option value="quarterly">Quarterly (Q1 - Q4)</option>
                  <option value="monthly">Monthly (12 Months)</option>
                </select>
              </div>
            </div>

            <div className="border rounded-lg p-3 max-h-80 overflow-y-auto space-y-2">
              <span className="text-xs font-semibold text-muted-foreground block mb-2">
                Generated Period Hierarchy:
              </span>

              {isSimLoading ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Calculating periods...
                </div>
              ) : simulatedPeriods.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No periods generated.
                </div>
              ) : (
                simulatedPeriods.map((rootNode, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="p-2.5 rounded-md bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs">
                      <div className="flex justify-between items-center font-bold text-teal-900 dark:text-teal-200">
                        <span>Root: {rootNode.period_label}</span>
                        <span className="font-mono text-[11px] font-normal">
                          {rootNode.period_start_date} → {rootNode.period_end_date}
                        </span>
                      </div>
                    </div>

                    {rootNode.children && rootNode.children.length > 0 && (
                      <div className="pl-4 space-y-1.5 border-l-2 border-teal-200 dark:border-teal-800">
                        {rootNode.children.map((child, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-2 rounded bg-card border text-xs flex justify-between items-center"
                          >
                            <span className="font-medium text-foreground">
                              {child.period_label}
                            </span>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {child.period_start_date} to {child.period_end_date}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Frequency Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border shadow-2xl p-6 text-foreground animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-xl font-bold mb-1">Add Reporting Frequency</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Define a new cadence for company production reporting schedules.
            </p>

            {formError && (
              <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateFrequency} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium mb-1">Frequency Name *</label>
                <Input
                  required
                  placeholder="e.g., Bi-Weekly"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Unique Code *</label>
                <Input
                  required
                  placeholder="e.g., bi_weekly"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Interval Days</label>
                  <Input
                    type="number"
                    placeholder="e.g., 14"
                    value={intervalDays}
                    onChange={(e) => setIntervalDays(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Calendar Basis</label>
                  <select
                    value={calendarBasis}
                    onChange={(e) => setCalendarBasis(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="gregorian">Gregorian</option>
                    <option value="fiscal">Fiscal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  className="w-full rounded-md border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Optional frequency description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={isCreating}
                >
                  {isCreating ? "Saving..." : "Create Frequency"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
