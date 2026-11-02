"use client";

import React from "react";
import { Link } from "@/i18n/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RegionalIssue,
  RegionalIssueStatus,
  RegionalEscalationStatus,
} from "@/redux/types/regionalIssue";
import { IssuePriority, IssueCategory } from "@/redux/types/issue";
import {
  RegionalIssueStatusBadge,
  RegionalEscalationStatusBadge,
} from "./RegionalIssueStatusBadge";
import {
  Search,
  Plus,
  FilterX,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

interface RegionalIssuesListProps {
  regionId: string;
  issues: RegionalIssue[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  isLoading: boolean;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  priorityFilter: string;
  onPriorityChange: (pId: string) => void;
  categoryFilter: string;
  onCategoryChange: (cId: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  onPageChange: (newPage: number) => void;
  onResetFilters: () => void;
  priorities?: IssuePriority[];
  categories?: IssueCategory[];
  canCreate?: boolean;
}

export function RegionalIssuesList({
  regionId,
  issues,
  total,
  page,
  limit,
  totalPages,
  isLoading,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  categoryFilter,
  onCategoryChange,
  search,
  onSearchChange,
  onPageChange,
  onResetFilters,
  priorities = [],
  categories = [],
  canCreate = true,
}: RegionalIssuesListProps) {
  return (
    <div className="space-y-4">
      {/* Search and Filters Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-4 rounded-lg border">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or #..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8"
            />
          </div>

          <Select value={priorityFilter} onValueChange={onPriorityChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {priorities.map((p) => (
                <SelectItem key={p.issue_priority_id} value={p.issue_priority_id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.issue_category_id} value={c.issue_category_id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(search || priorityFilter !== "all" || categoryFilter !== "all" || statusFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <FilterX className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
        </div>

        {canCreate && (
          <Link href={`/${regionId}/issues/new`}>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white shrink-0">
              <Plus className="h-4 w-4 mr-1.5" />
              Submit Regional Issue
            </Button>
          </Link>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[150px]">Issue #</TableHead>
              <TableHead>Title & Category</TableHead>
              <TableHead className="w-[110px]">Priority</TableHead>
              <TableHead className="w-[130px]">Status</TableHead>
              <TableHead className="w-[160px]">Escalation</TableHead>
              <TableHead className="w-[150px]">Raiser</TableHead>
              <TableHead className="w-[150px]">Assignee</TableHead>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead className="w-[80px] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9} className="h-12 text-center">
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4 mx-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : issues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-40 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
                    <p className="font-medium text-sm">No regional issues found</p>
                    <p className="text-xs text-muted-foreground">
                      Try adjusting your filters or submit a new regional issue.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              issues.map((issue) => (
                <TableRow key={issue.regional_issue_id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Link
                      href={`/${regionId}/issues/${issue.regional_issue_id}`}
                      className="hover:underline text-amber-700 dark:text-amber-400"
                    >
                      {issue.issue_number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm text-foreground truncate max-w-xs">
                      {issue.title}
                    </div>
                    {issue.category && (
                      <div className="text-xs text-muted-foreground">
                        {issue.category.name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {issue.priority ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
                        style={{
                          backgroundColor: issue.priority.color_hex
                            ? `${issue.priority.color_hex}15`
                            : undefined,
                          borderColor: issue.priority.color_hex || undefined,
                          color: issue.priority.color_hex || undefined,
                        }}
                      >
                        {issue.priority.label}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <RegionalIssueStatusBadge status={issue.status} />
                  </TableCell>
                  <TableCell>
                    <RegionalEscalationStatusBadge status={issue.escalation_status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {issue.raiser?.full_name || issue.raiser?.email || "Unknown"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {issue.assignee?.full_name || "Unassigned"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {issue.created_at ? format(new Date(issue.created_at), "yyyy-MM-dd") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/${regionId}/issues/${issue.regional_issue_id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
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
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
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
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

