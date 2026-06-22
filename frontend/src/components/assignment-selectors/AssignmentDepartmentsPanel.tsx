"use client";

import { PlanNodeAssignmentOptionDepartment } from "@/redux/types/plan";
import { SelectableSearchList } from "./SelectableSearchList";

interface AssignmentDepartmentsPanelProps {
    departments: PlanNodeAssignmentOptionDepartment[];
    selectedId: string | null;
    onSelect: (internalStructureId: string) => void;
    isLoading?: boolean;
    disabled?: boolean;
}

export function AssignmentDepartmentsPanel({
    departments,
    selectedId,
    onSelect,
    isLoading,
    disabled,
}: AssignmentDepartmentsPanelProps) {
    return (
        <SelectableSearchList
            items={departments}
            getItemId={(department) => department.internal_structure_id}
            selectedId={selectedId}
            onSelect={onSelect}
            isLoading={isLoading}
            disabled={disabled}
            searchPlaceholder="Search departments..."
            emptyMessage="No eligible departments"
            filterItem={(department, search) =>
                department.name.toLowerCase().includes(search)
            }
            renderItem={(department) => (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{department.name}</span>
                    <span className="text-xs text-gray-500">Level {department.level}</span>
                </div>
            )}
        />
    );
}
