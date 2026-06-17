"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Loader2 } from "lucide-react";
import { actionFeedback } from "@/components/action-feedback";
import { useDuplicatePlanDraftMutation } from "@/redux/api/planApi";
import { PlanVersion } from "@/redux/types/plan";
import { formatPlanningPeriod, getPlanDraftDisplayName } from "@/utils/planDraftUtils";
import { getApiErrorMessage } from "@/utils/apiErrorUtils";
import { useRouter } from "next/navigation";
import { PermissionGuard } from "@/utils/PermissionGuard";
import { PLAN_DRAFT_PUBLISH_PERMISSIONS } from "@/utils/planPermissionUtils";

interface DuplicatePlanDraftModalProps {
    isOpen: boolean;
    onClose: () => void;
    version: PlanVersion;
    draftLabel?: string;
}

export function DuplicatePlanDraftModal({
    isOpen,
    onClose,
    version,
    draftLabel = "plan draft",
}: DuplicatePlanDraftModalProps) {
    const router = useRouter();
    const [draftName, setDraftName] = useState("");
    const [duplicate, { isLoading }] = useDuplicatePlanDraftMutation();

    useEffect(() => {
        if (isOpen) {
            setDraftName(`Copy of ${getPlanDraftDisplayName(version)}`);
        }
    }, [isOpen, version]);

    const handleDuplicate = async () => {
        const trimmed = draftName.trim();
        if (!trimmed) {
            actionFeedback.error("Draft name is required");
            return;
        }

        try {
            const copied = await duplicate({
                id: version.plan_version_id,
                data: { draft_name: trimmed },
            }).unwrap();

            actionFeedback.success(
                `${draftLabel} duplicated. Structure, assignments, and targets were copied; workflow milestones were reset.`
            );
            onClose();
            router.push(`/plans/${copied.plan_version_id}`);
        } catch (error: unknown) {
            actionFeedback.error(getApiErrorMessage(error, `Failed to duplicate ${draftLabel}`));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex w-[calc(100%-2rem)] max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[520px] top-[max(1rem,5dvh)] translate-y-0 sm:top-[50%] sm:-translate-y-1/2">
                <DialogHeader className="shrink-0 px-6 pt-6 pb-4 pr-12">
                    <DialogTitle className="flex items-center gap-2">
                        <Copy className="h-5 w-5" />
                        Duplicate {draftLabel}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Creates a new independent {draftLabel} with the full hierarchy, assignments,
                        and target values from{" "}
                        <span className="font-medium text-foreground">
                            {getPlanDraftDisplayName(version)}
                        </span>{" "}
                        ({formatPlanningPeriod(version)}). Annual and execution-period copies are
                        included when they exist. The copy is not linked to the original and workflow
                        milestones start fresh.
                    </p>

                    <div className="space-y-2">
                        <Label htmlFor="duplicate-draft-name">New draft name</Label>
                        <Input
                            id="duplicate-draft-name"
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            placeholder="Enter name for the copy"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <DialogFooter className="shrink-0 border-t px-6 py-4">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <PermissionGuard requireAll={PLAN_DRAFT_PUBLISH_PERMISSIONS}>
                        <Button onClick={handleDuplicate} disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Duplicating...
                                </>
                            ) : (
                                <>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Duplicate
                                </>
                            )}
                        </Button>
                    </PermissionGuard>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
