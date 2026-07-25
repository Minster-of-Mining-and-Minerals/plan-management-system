"use strict";

const db = require("../../models");

/**
 * Platform-wide Standard Lifecycle Stages
 */
const UNIFIED_CLINICAL_ORDER_STAGES = {
  ORDERED: "ORDERED",
  PREPARED: "PREPARED",
  IN_PROGRESS: "IN_PROGRESS",
  FULFILLED: "FULFILLED",
  VERIFIED: "VERIFIED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

/**
 * Domain-specific status to Unified Platform Stage mapping
 */
const DOMAIN_STATUS_MAP = {
  // Laboratory Domain
  LABORATORY: {
    ordered: UNIFIED_CLINICAL_ORDER_STAGES.ORDERED,
    specimen_collected: UNIFIED_CLINICAL_ORDER_STAGES.PREPARED,
    received: UNIFIED_CLINICAL_ORDER_STAGES.PREPARED,
    in_progress: UNIFIED_CLINICAL_ORDER_STAGES.IN_PROGRESS,
    completed: UNIFIED_CLINICAL_ORDER_STAGES.FULFILLED,
    verified: UNIFIED_CLINICAL_ORDER_STAGES.VERIFIED,
    cancelled: UNIFIED_CLINICAL_ORDER_STAGES.CANCELLED,
  },
  // Radiology Domain
  RADIOLOGY: {
    ordered: UNIFIED_CLINICAL_ORDER_STAGES.ORDERED,
    scheduled: UNIFIED_CLINICAL_ORDER_STAGES.PREPARED,
    in_progress: UNIFIED_CLINICAL_ORDER_STAGES.IN_PROGRESS,
    completed: UNIFIED_CLINICAL_ORDER_STAGES.FULFILLED,
    reported: UNIFIED_CLINICAL_ORDER_STAGES.FULFILLED,
    verified: UNIFIED_CLINICAL_ORDER_STAGES.VERIFIED,
    released: UNIFIED_CLINICAL_ORDER_STAGES.VERIFIED,
    cancelled: UNIFIED_CLINICAL_ORDER_STAGES.CANCELLED,
  },
  // Pharmacy Domain
  PHARMACY: {
    DRAFT: UNIFIED_CLINICAL_ORDER_STAGES.ORDERED,
    SUBMITTED: UNIFIED_CLINICAL_ORDER_STAGES.ORDERED,
    SAFETY_CHECK_PENDING: UNIFIED_CLINICAL_ORDER_STAGES.PREPARED,
    SAFETY_APPROVED: UNIFIED_CLINICAL_ORDER_STAGES.PREPARED,
    SENT_TO_PHARMACY: UNIFIED_CLINICAL_ORDER_STAGES.PREPARED,
    PHARMACY_REVIEW: UNIFIED_CLINICAL_ORDER_STAGES.IN_PROGRESS,
    STOCK_RESERVED: UNIFIED_CLINICAL_ORDER_STAGES.IN_PROGRESS,
    DISPENSING: UNIFIED_CLINICAL_ORDER_STAGES.IN_PROGRESS,
    DISPENSED: UNIFIED_CLINICAL_ORDER_STAGES.FULFILLED,
    COMPLETED: UNIFIED_CLINICAL_ORDER_STAGES.COMPLETED,
    CANCELLED: UNIFIED_CLINICAL_ORDER_STAGES.CANCELLED,
  },
};

class UnifiedClinicalOrderStateMachine {
  /**
   * Map any domain-specific status into standard platform stage.
   */
  mapDomainStatusToUnifiedStage(orderType, domainStatus) {
    if (!orderType || !domainStatus) return UNIFIED_CLINICAL_ORDER_STAGES.ORDERED;

    const typeKey = orderType.toUpperCase();
    const domainMap = DOMAIN_STATUS_MAP[typeKey] || {};
    const mappedStage = domainMap[domainStatus] || domainMap[domainStatus.toLowerCase()] || domainMap[domainStatus.toUpperCase()];

    return mappedStage || UNIFIED_CLINICAL_ORDER_STAGES.ORDERED;
  }

  /**
   * Get unified order status for a ClinicalOrder record.
   */
  getUnifiedStatus(clinicalOrder) {
    if (!clinicalOrder) return UNIFIED_CLINICAL_ORDER_STAGES.ORDERED;

    const rawType = clinicalOrder.order_type || "LABORATORY";
    const rawStatus = clinicalOrder.order_status || clinicalOrder.status || clinicalOrder.laboratory_status || "ordered";

    return this.mapDomainStatusToUnifiedStage(rawType, rawStatus);
  }
}

module.exports = {
  UnifiedClinicalOrderStateMachine: new UnifiedClinicalOrderStateMachine(),
  UNIFIED_CLINICAL_ORDER_STAGES,
  DOMAIN_STATUS_MAP,
};
