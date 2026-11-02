"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  useGetFederalRegionalEscalationsQuery,
  useGetFederalRegionalEscalationStatsQuery,
  FederalRegionalEscalationItem,
} from "@/redux/api/federalRegionalEscalationApi";
import { useGetRegionsQuery } from "@/redux/api/regionApi";
import {
  RegionalIssueStatusBadge,
  RegionalEscalationStatusBadge,
} from "@/features/regional-issues/RegionalIssueStatusBadge";
import { FederalEscalationDetailModal } from "./FederalEscalationDetailModal";
import {
  Search,
  FilterX,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowUpRight,
  Clock,
  HelpCircle,
  CheckCircle2,
  Archive,
  RotateCcw,
  FileText,
  Building,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function FederalRegionalIssuesTab() {
  const [page, setPage] = useState(1);
  const [regionFilter, setRegionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assistanceFilter, setAssistanceFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [selectedEscalationId, setSelectedEscalationId] = useState<string | null>(null);

  // Queries
  const { data: regions = [] } = useGetRegionsQuery({ is_active: true });

  const { data: stats, isLoading: isStatsLoading, refetch: refetchStats } =
    useGetFederalRegionalEscalationStatsQuery(
      regionFilter !== "all" ? { region_id: regionFilter } : undefined
    );

  const queryParams = {
    page,
    limit: 15,
    region_id: regionFilter !== "all" ? regionFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    assistance_type: assistanceFilter !== "all" ? assistanceFilter : undefined,
    search: search ? search.trim() : undefined,
  };

  const { data: escalationsData, isLoading: isListLoading, refetch: refetchList } =
    useGetFederalRegionalEscalationsQuery(queryParams);

  const escalations = escalationsData?.data || [];
  const total = escalationsData?.pagination?.total || 0;
  const totalPages = escalationsData?.pagination?.totalPages || 1;

  const handleResetFilters = () => {
    setRegionFilter("all");
    setStatusFilter("all");
    setAssistanceFilter("all");
    setSearch("");
    setPage(1);
  };

  const statCards = [
    {
      id: "all",
      label: "Total Escalations",
      count: stats?.total ?? 0,
      icon: FileText,
      color: "text-slate-700",
      bg: "bg-slate-50 dark:bg-slate-900/50",
      border: "border-slate-200",
      activeRing: "ring-2 ring-slate-400",
    },
    {
      id: "escalated",
      label: "New Escalations",
      count: stats?.escalated ?? 0,
      icon: ArrowUpRight,
      color: "text-purple-700",
      bg: "bg-purple-50/70 dark:bg-purple-950/30",
      border: "border-purple-200",
      activeRing: "ring-2 ring-purple-500",
    },
    {
      id: "under_federal_review",
      label: "Under Review",
      count: stats?.under_federal_review ?? 0,
      icon: Clock,
      color: "text-blue-700",
      bg: "bg-blue-50/70 dark:bg-blue-950/30",
      border: "border-blue-200",
      activeRing: "ring-2 ring-blue-500",
    },
    {
      id: "clarification_requested",
      label: "Clarification Req.",
      count: stats?.clarification_requested ?? 0,
      icon: HelpCircle,
      color: "text-orange-700",
      bg: "bg-orange-50/70 dark:bg-orange-950/30",
      border: "border-orange-200",
      activeRing: "ring-2 ring-orange-500",
    },
    {
      id: "assistance_provided",
      label: "Guidance Provided",
      count: stats?.assistance_provided ?? 0,
      icon: CheckCircle2,
      color: "text-teal-700",
      bg: "bg-teal-50/70 dark:bg-teal-950/30",
      border: "border-teal-200",
      activeRing: "ring-2 ring-teal-500",
    },
    {
      id: "returned",
      label: "Returned to Region",
      count: stats?.returned ?? 0,
      icon: RotateCcw,
      color: "text-rose-700",
      bg: "bg-rose-50/70 dark:bg-rose-950/30",
      border: "border-rose-200",
      activeRing: "ring-2 ring-rose-500",
    },
    {
      id: "closed",
      label: "Closed / Concluded",
      count: stats?.closed ?? 0,
      icon: Archive,
      color: "text-zinc-600",
      bg: "bg-zinc-50 dark:bg-zinc-900/50",
      border: "border-zinc-200",
      activeRing: "ring-2 ring-zinc-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {statCards.map((c) => {
          const Icon = c.icon;
          const isActive = statusFilter === c.id;
          return (
            <Card
              key={c.id}
              onClick={() => {
                setStatusFilter(c.id);
                setPage(1);
              }}
              className={cn(
                "cursor-pointer transition-all duration-150 hover:shadow-xs border",
                c.bg,
                c.border,
                isActive ? c.activeRing : "hover:border-slate-300"
              )}
            >
              <CardContent className="p-3 flex flex-col justify-between h-full space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground truncate">
                    {c.label}
                  </span>
                  <Icon className={cn("h-4 w-4 shrink-0", c.color)} />
                </div>
                <div className="text-xl font-bold tracking-tight">
                  {isStatsLoading ? (
                    <div className="h-6 w-8 bg-muted animate-pulse rounded" />
                  ) : (
                    c.count
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-4 rounded-lg border">
        <div className="flex flex-1 items-center flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search escalation # or issue..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8"
            />
          </div>

          {/* Region Filter */}
          <Select
            value={regionFilter}
            onValueChange={(val) => {
              setRegionFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📍 All Regions</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.region_id} value={r.region_id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Assistance Type Filter */}
          <Select
            value={assistanceFilter}
            onValueChange={(val) => {
              setAssistanceFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Assistance Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assistance Types</SelectItem>
              <SelectItem value="technical_support">Technical Support</SelectItem>
              <SelectItem value="policy_clarification">Policy Clarification</SelectItem>
              <SelectItem value="legal_clarification">Legal Clarification</SelectItem>
              <SelectItem value="financial_intervention">Financial Intervention</SelectItem>
              <SelectItem value="security_assistance">Security Assistance</SelectItem>
              <SelectItem value="other">Other Assistance</SelectItem>
            </SelectContent>
          </Select>

          {(search || regionFilter !== "all" || statusFilter !== "all" || assistanceFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <FilterX className="h-4 w-4 mr-1" />
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Escalations Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[150px]">Escalation #</TableHead>
              <TableHead className="w-[140px]">Origin Region</TableHead>
              <TableHead>Issue & Category</TableHead>
              <TableHead className="w-[140px]">Assistance Type</TableHead>
              <TableHead className="w-[110px]">Priority</TableHead>
              <TableHead className="w-[150px]">Federal Status</TableHead>
              <TableHead className="w-[130px]">Regional Status</TableHead>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead className="w-[80px] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isListLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9} className="h-12 text-center">
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4 mx-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : escalations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-36 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Building className="h-8 w-8 text-muted-foreground/60" />
                    <p className="font-medium text-sm">No regional escalations found</p>
                    <p className="text-xs text-muted-foreground">
                      No regional issues have been escalated matching the selected filters.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              escalations.map((item) => (
                <TableRow
                  key={item.escalation_id}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => setSelectedEscalationId(item.escalation_id)}
                >
                  <TableCell className="font-mono text-xs font-semibold text-purple-700 dark:text-purple-400">
                    {item.escalation_number}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-900 border-amber-200">
                      📍 {item.region?.name || "Region"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm text-foreground truncate max-w-xs">
                      {item.regionalIssue?.title || "Regional Issue"}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {item.regionalIssue?.issue_number}
                      {item.regionalIssue?.category && ` • ${item.regionalIssue.category.name}`}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize text-xs text-foreground font-medium">
                      {item.assistance_type?.replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wider text-[10px]",
                        item.escalation_priority === "critical"
                          ? "bg-rose-50 text-rose-700 border-rose-300 font-bold"
                          : item.escalation_priority === "urgent"
                          ? "bg-amber-50 text-amber-700 border-amber-300"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      )}
                    >
                      {item.escalation_priority}
                    </span>
                  </TableCell>
                  <TableCell>
                    <RegionalEscalationStatusBadge status={item.escalation_status as any} />
                  </TableCell>
                  <TableCell>
                    <RegionalIssueStatusBadge
                      status={(item.regionalIssue?.status as any) || "submitted"}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.escalated_at ? format(new Date(item.escalated_at), "yyyy-MM-dd") : "—"}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSelectedEscalationId(item.escalation_id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <div>
            Showing {(page - 1) * 15 + 1} to {Math.min(page * 15, total)} of {total} entries
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail & Response Dialog */}
      <FederalEscalationDetailModal
        isOpen={selectedEscalationId !== null}
        onClose={() => setSelectedEscalationId(null)}
        escalationId={selectedEscalationId}
        onRefresh={() => {
          refetchList();
          refetchStats();
        }}
      />
    </div>
  );
}

