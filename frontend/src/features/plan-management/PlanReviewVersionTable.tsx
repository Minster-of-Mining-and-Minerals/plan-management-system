"use client";

import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { useGetPlanVersionsForReviewQuery } from "@/redux/api/planApi";
import { PlanVersion } from "@/redux/types/plan";
import { formatStatus } from "@/utils/statusFormatter";
import {
    formatDurationYears,
    formatPlanningPeriod,
} from "@/utils/planDraftUtils";
import {
    formatReviewVersionLabel,
    getPlanReviewDisplayName,
} from "@/utils/planReviewUtils";
import { useSearchParams, useRouter } from "next/navigation";
import { matchesSearchQuery } from "@/utils/tableUtils";

function formatReviewStatus(status: PlanVersion["review_status"]) {
    if (!status) return "—";
    return status.replace(/_/g, " ");
}

export default function PlanReviewVersionTable() {
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get("search") || "";
    const router = useRouter();

    const { data: response, isLoading } = useGetPlanVersionsForReviewQuery({
        search: searchQuery || undefined,
    });

    const versions = (response || []).filter((version) =>
        matchesSearchQuery(searchQuery, [
            getPlanReviewDisplayName(version),
            version.governmentStructure?.name,
            version.review_status,
            formatReviewVersionLabel(version.review_version_number),
        ])
    );

    const columns: ColumnDef<PlanVersion>[] = [
        {
            accessorKey: "draft_name",
            header: "Plan",
            meta: {
                headerClassName: "w-[34%] max-w-[320px]",
                cellClassName: "max-w-0 overflow-hidden !whitespace-normal",
            },
            cell: ({ row }) => {
                const name = getPlanReviewDisplayName(row.original);
                return (
                    <span className="font-medium text-primary block truncate" title={name}>
                        {name}
                    </span>
                );
            },
        },
        {
            id: "review_version",
            header: "Review Version",
            cell: ({ row }) => (
                <Badge variant="outline" className="font-mono text-xs">
                    {formatReviewVersionLabel(row.original.review_version_number)}
                </Badge>
            ),
        },
        {
            id: "planning_period",
            header: "Planning Period",
            cell: ({ row }) => (
                <span className="text-sm text-gray-600">
                    {formatPlanningPeriod(row.original)}
                </span>
            ),
        },
        {
            id: "duration",
            header: "Duration",
            cell: ({ row }) => (
                <span className="text-sm text-gray-600">
                    {formatDurationYears(row.original.planning_duration_years)}
                </span>
            ),
        },
        {
            accessorKey: "review_status",
            header: "Review Status",
            cell: ({ row }) => (
                <Badge
                    variant="outline"
                    className="capitalize border-amber-200 bg-amber-50 text-amber-800"
                >
                    {formatReviewStatus(row.original.review_status)}
                </Badge>
            ),
        },
        {
            accessorKey: "status",
            header: "Plan Status",
            cell: ({ row }) => (
                <Badge variant="secondary" className="capitalize">
                    {formatStatus(row.original.status)}
                </Badge>
            ),
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() =>
                        router.push(`/plans/review/${row.original.plan_version_id}`)
                    }
                >
                    <Eye className="h-4 w-4" />
                    Review
                </Button>
            ),
        },
    ];

    return (
        <TableLayout
            title="Plans for Review"
            description="Published plans available for your review. Open a plan to browse the full hierarchy and raise issues during active review."
        >
            <DataTable
                columns={columns}
                data={versions}
                isLoading={isLoading}
            />
        </TableLayout>
    );
}
