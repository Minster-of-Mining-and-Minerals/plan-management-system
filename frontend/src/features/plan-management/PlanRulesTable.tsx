"use client";

import { useState } from "react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash } from "lucide-react";
import type { ActionButton } from "@/types/tableLayout";
import {
    useGetPlanRulesQuery,
    useDeletePlanRuleMutation,
} from "@/redux/api/planRuleApi";
import { PlanRule } from "@/redux/types/plan";
import { toast } from "sonner";
import { CreatePlanRuleModal } from "./modals/CreatePlanRuleModal";
import { getWeightStartLevel, sortSteps } from "@/utils/planRuleUtils";

export default function PlanRulesTable() {
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [selectedRule, setSelectedRule] = useState<PlanRule | null>(null);
    const [isModalOpen, setModalOpen] = useState(false);

    const { data: rules = [], isLoading, refetch } = useGetPlanRulesQuery({});
    const [deleteRule] = useDeletePlanRuleMutation();

    const columns: ColumnDef<PlanRule>[] = [
        {
            accessorKey: "name",
            header: "Rule Name",
            cell: ({ row }) => (
                <span className="font-medium text-primary">{row.getValue("name")}</span>
            ),
        },
        {
            id: "weight",
            header: "Weight required from",
            cell: ({ row }) => {
                const start = getWeightStartLevel(row.original);
                if (!start) return <span className="text-muted-foreground">None</span>;
                return <span className="text-sm">Level {start} (inherited below)</span>;
            },
        },
        {
            id: "cascade",
            header: "Levels",
            cell: ({ row }) => {
                const steps = sortSteps(row.original.steps ?? []);
                return (
                    <span className="text-sm text-muted-foreground">
                        {steps.map((s) => s.label).join(" → ")}
                    </span>
                );
            },
        },
        {
            accessorKey: "governmentStructure",
            header: "Scope",
            cell: ({ row }) => (
                <span>{row.original.governmentStructure?.name || "Global"}</span>
            ),
        },
        {
            accessorKey: "is_active",
            header: "Status",
            cell: ({ row }) => (
                <Badge status={row.original.is_active ? "active" : "inactive"}>
                    {row.original.is_active ? "Active" : "Inactive"}
                </Badge>
            ),
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <Button
                        onClick={() => {
                            setSelectedRule(row.original);
                            setModalOpen(true);
                        }}
                        variant="ghost"
                        size="icon"
                        title="Edit"
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        onClick={() => handleDelete(row.original.plan_rule_id)}
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                        title="Delete"
                    >
                        <Trash className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this plan rule? Plans using it must be reassigned first.")) return;
        try {
            await deleteRule(id).unwrap();
            toast.success("Plan rule deleted");
            refetch();
        } catch (err: unknown) {
            const error = err as { data?: { message?: string } };
            toast.error(error.data?.message || "Failed to delete plan rule");
        }
    };

    const actions: ActionButton[] = [
        {
            label: "Create Plan Rule",
            icon: <Plus className="h-4 w-4" />,
            variant: "default",
            onClick: () => {
                setSelectedRule(null);
                setModalOpen(true);
            },
        },
    ];

    const handlePagination = (index: number, size: number) => {
        setPageIndex(index);
        setPageSize(size);
    };

    return (
        <>
            <TableLayout
                title="Plan Rules"
                description="Configure hierarchy levels, labels, and where weight evaluation begins."
                actions={actions}
                filters={[]}
            >
                <DataTable
                    columns={columns}
                    data={rules}
                    totalPageCount={Math.ceil(rules.length / pageSize)}
                    handlePagination={handlePagination}
                    tablePageSize={pageSize}
                    currentIndex={pageIndex}
                    isLoading={isLoading}
                />
            </TableLayout>

            <CreatePlanRuleModal
                isOpen={isModalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setSelectedRule(null);
                    refetch();
                }}
                rule={selectedRule}
            />
        </>
    );
}
