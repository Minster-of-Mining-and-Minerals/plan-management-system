"use strict";

const timelineEventService = require("../timelineEventService");
const { UnifiedClinicalOrderStateMachine } = require("./unifiedClinicalOrderStateMachine");

class UnifiedTimelineHarmonizer {
  /**
   * Harmonize order state transitions by emitting domain event & standardized CLINICAL_ORDER_STATE_CHANGED event.
   */
  async emitOrderStateTransition({ patientId, clinicalOrderId, orderType, domainStatus, actorId, details = {} }, transaction = null) {
    if (!patientId || !clinicalOrderId || !orderType) return;

    const unifiedStage = UnifiedClinicalOrderStateMachine.mapDomainStatusToUnifiedStage(orderType, domainStatus);

    if (timelineEventService && typeof timelineEventService.emit === "function") {
      try {
        await timelineEventService.emit(
          {
            patient_id: patientId,
            event_type: "CLINICAL_ORDER_STATE_CHANGED",
            title: `Clinical Order [${orderType}]: ${unifiedStage}`,
            description: `Order #${clinicalOrderId.slice(0, 8)} (${orderType}) transitioned to stage ${unifiedStage} (Status: ${domainStatus})`,
            actor_id: actorId,
            resource_type: "ClinicalOrder",
            resource_id: clinicalOrderId,
            metadata: {
              order_type: orderType,
              domain_status: domainStatus,
              unified_stage: unifiedStage,
              ...details,
            },
          },
          transaction
        );
      } catch (err) {
        console.error("Failed to emit harmonized timeline event:", err.message);
      }
    }
  }
}

module.exports = new UnifiedTimelineHarmonizer();
