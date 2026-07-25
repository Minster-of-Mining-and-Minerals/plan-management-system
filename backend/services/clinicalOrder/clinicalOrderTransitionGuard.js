"use strict";

const auditService = require("../auditService");
const { UNIFIED_CLINICAL_ORDER_STAGES } = require("./unifiedClinicalOrderStateMachine");

const ALLOWED_UNIFIED_TRANSITIONS = {
  [UNIFIED_CLINICAL_ORDER_STAGES.ORDERED]: [UNIFIED_CLINICAL_ORDER_STAGES.PREPARED, UNIFIED_CLINICAL_ORDER_STAGES.CANCELLED],
  [UNIFIED_CLINICAL_ORDER_STAGES.PREPARED]: [UNIFIED_CLINICAL_ORDER_STAGES.IN_PROGRESS, UNIFIED_CLINICAL_ORDER_STAGES.CANCELLED],
  [UNIFIED_CLINICAL_ORDER_STAGES.IN_PROGRESS]: [UNIFIED_CLINICAL_ORDER_STAGES.FULFILLED, UNIFIED_CLINICAL_ORDER_STAGES.CANCELLED],
  [UNIFIED_CLINICAL_ORDER_STAGES.FULFILLED]: [UNIFIED_CLINICAL_ORDER_STAGES.VERIFIED, UNIFIED_CLINICAL_ORDER_STAGES.COMPLETED, UNIFIED_CLINICAL_ORDER_STAGES.CANCELLED],
  [UNIFIED_CLINICAL_ORDER_STAGES.VERIFIED]: [UNIFIED_CLINICAL_ORDER_STAGES.COMPLETED, UNIFIED_CLINICAL_ORDER_STAGES.CANCELLED],
  [UNIFIED_CLINICAL_ORDER_STAGES.COMPLETED]: [],
  [UNIFIED_CLINICAL_ORDER_STAGES.CANCELLED]: [],
};

class ClinicalOrderTransitionGuard {
  /**
   * Validate whether a transition between unified stages is allowed.
   */
  validateTransition(fromStage, toStage, domainExceptions = []) {
    if (!fromStage || !toStage) return { valid: false, reason: "Missing stage inputs" };
    if (fromStage === toStage) return { valid: true, reason: "Idempotent state" };

    const allowed = ALLOWED_UNIFIED_TRANSITIONS[fromStage] || [];
    if (allowed.includes(toStage) || domainExceptions.includes(toStage)) {
      return { valid: true };
    }

    return {
      valid: false,
      reason: `Illegal lifecycle transition from stage '${fromStage}' to '${toStage}'. Allowed target stages: [${allowed.join(", ")}]`,
    };
  }

  /**
   * Enforce state transition guard & log audit on violation.
   */
  async enforceTransitionGuard({ clinicalOrderId, fromStage, toStage, actorId, domain = "GENERAL" }) {
    const result = this.validateTransition(fromStage, toStage);
    if (!result.valid) {
      if (auditService && typeof auditService.logAudit === "function") {
        await auditService.logAudit({
          actorUserId: actorId,
          action: "REJECTED_CLINICAL_ORDER_TRANSITION",
          resourceType: "ClinicalOrder",
          resourceId: clinicalOrderId,
          details: { fromStage, toStage, domain, reason: result.reason },
        });
      }

      const err = new Error(`[ClinicalOrderTransitionGuard] ${result.reason}`);
      err.status = 400;
      throw err;
    }

    return result;
  }
}

module.exports = new ClinicalOrderTransitionGuard();
