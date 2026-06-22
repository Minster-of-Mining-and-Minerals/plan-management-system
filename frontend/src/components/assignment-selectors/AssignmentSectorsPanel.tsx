"use client";

import { PlanNodeAssignmentOptionSector } from "@/redux/types/plan";
import { SelectableSearchList } from "./SelectableSearchList";

interface AssignmentSectorsPanelProps {
    sectors: PlanNodeAssignmentOptionSector[];
    selectedId: string | null;
    onSelect: (governmentStructureId: string) => void;
    isLoading?: boolean;
    disabled?: boolean;
}

export function AssignmentSectorsPanel({
    sectors,
    selectedId,
    onSelect,
    isLoading,
    disabled,
}: AssignmentSectorsPanelProps) {
    return (
        <SelectableSearchList
            items={sectors}
            getItemId={(sector) => sector.government_structure_id}
            selectedId={selectedId}
            onSelect={onSelect}
            isLoading={isLoading}
            disabled={disabled}
            searchPlaceholder="Search sectors..."
            emptyMessage="No eligible sectors"
            filterItem={(sector, search) => sector.name.toLowerCase().includes(search)}
            renderItem={(sector) => (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{sector.name}</span>
                    <span className="text-xs text-gray-500">Level {sector.level}</span>
                </div>
            )}
        />
    );
}
