"use strict";

const UPDATE_PERMISSION = "plans:update";
const EDIT_FINALIZED_PERMISSION = "plans:edit_finalized";
const {
    isPlanInActiveReview,
    isMasterCorrectionsUnlocked,
    canEditPlanDuringReview,
} = require("./planReviewUtils");

function isMasterDraft(planVersion) {
    return planVersion?.version_kind === "master" && planVersion?.status === "draft";
}

function isMasterFinalized(planVersion) {
    return planVersion?.version_kind === "master" && planVersion?.status === "finalized";
}

function userCanUpdatePlans(user) {
    return Boolean(user?.permissions?.includes(UPDATE_PERMISSION));
}

function userCanEditFinalizedMaster(user) {
    return Boolean(user?.permissions?.includes(EDIT_FINALIZED_PERMISSION));
}

function canEditMasterPlanStructure(planVersion, user) {
    if (planVersion?.version_kind === "master" && isPlanInActiveReview(planVersion)) {
        return canEditPlanDuringReview(planVersion, user);
    }
    if (isMasterDraft(planVersion)) {
        return userCanUpdatePlans(user);
    }
    if (isMasterFinalized(planVersion)) {
        return userCanEditFinalizedMaster(user);
    }
    return false;
}

function validateCanEditMasterPlanStructure(planVersion, user) {
    if (canEditMasterPlanStructure(planVersion, user)) {
        return { valid: true, isFinalizedEdit: isMasterFinalized(planVersion) };
    }

    if (isMasterDraft(planVersion)) {
        return {
            valid: false,
            message:
                "You need the Update Plans permission to edit draft strategic plan structure.",
        };
    }

    if (isMasterFinalized(planVersion)) {
        if (isPlanInActiveReview(planVersion) && !isMasterCorrectionsUnlocked(planVersion)) {
            return {
                valid: false,
                message: "This plan is under review and is read-only until corrections are unlocked.",
            };
        }
        return {
            valid: false,
            message:
                "This finalized strategic plan is locked. You need the Edit Finalized Plan permission to change its structure.",
        };
    }

    return {
        valid: false,
        message: "Can only edit nodes on draft or authorized finalized master plan versions",
    };
}

function validatePlanLifecyclePermission(user, permission, actionLabel) {
    if (user?.permissions?.includes(permission)) {
        return { valid: true };
    }
    return {
        valid: false,
        message: `Access denied: ${actionLabel} permission required`,
    };
}

module.exports = {
    UPDATE_PERMISSION,
    EDIT_FINALIZED_PERMISSION,
    PLAN_LIFECYCLE_PERMISSIONS: {
        START_PROCESS: "plan:start_process",
        COMPLETE_ANNUAL: "plan:complete_annual",
        COMPLETE_PERIOD: "plan:complete_period",
        FINALIZE: "plan:finalize",
        DRAFT_PUBLISH: "plan:draft_publish",
        PUBLISH_FOR_REVIEW: "plan:publish_for_review",
        VIEW_ASSIGNED_REVIEW: "plan:view_assigned_review",
        COMPLETE_REVIEW: "plan:complete_review",
        UNLOCK_REVIEW_CORRECTIONS: "plan:unlock_review_corrections",
        REPUBLISH_REVIEW: "plan:republish_review",
    },
    isMasterDraft,
    isMasterDraftVersion: isMasterDraft,
    isMasterFinalized,
    userCanUpdatePlans,
    userCanEditFinalizedMaster,
    canEditMasterPlanStructure,
    validateCanEditMasterPlanStructure,
    validatePlanLifecyclePermission,
};
