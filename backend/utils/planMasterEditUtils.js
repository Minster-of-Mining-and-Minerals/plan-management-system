"use strict";

const EDIT_FINALIZED_PERMISSION = "plans:edit_finalized";

function isMasterDraft(planVersion) {
    return planVersion?.version_kind === "master" && planVersion?.status === "draft";
}

function isMasterFinalized(planVersion) {
    return planVersion?.version_kind === "master" && planVersion?.status === "finalized";
}

function userCanEditFinalizedMaster(user) {
    return Boolean(user?.permissions?.includes(EDIT_FINALIZED_PERMISSION));
}

function canEditMasterPlanStructure(planVersion, user) {
    if (isMasterDraft(planVersion)) {
        return true;
    }
    if (isMasterFinalized(planVersion) && userCanEditFinalizedMaster(user)) {
        return true;
    }
    return false;
}

function validateCanEditMasterPlanStructure(planVersion, user) {
    if (canEditMasterPlanStructure(planVersion, user)) {
        return { valid: true, isFinalizedEdit: isMasterFinalized(planVersion) };
    }

    if (isMasterFinalized(planVersion)) {
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

module.exports = {
    EDIT_FINALIZED_PERMISSION,
    isMasterDraft,
    isMasterDraftVersion: isMasterDraft,
    isMasterFinalized,
    userCanEditFinalizedMaster,
    canEditMasterPlanStructure,
    validateCanEditMasterPlanStructure,
};
