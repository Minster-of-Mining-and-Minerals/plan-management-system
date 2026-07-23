"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const timelineEventService = require("./timelineEventService");
const { recordAudit } = require("./auditService");
const notificationService = require("./notificationService");
const encounterFollowUpService = require("./encounterFollowUpService");
const followUpContinuityService = require("./followUpContinuityService");
const { EncounterFollowUp, EncounterFollowUpOutcome, EncounterFollowUpAttempt, StaffAppointment, User, MedicalHistoryLog } = db;

/**
 * Timeline event types for follow-up outcomes.
 */
const TIMELINE_EVENTS = {
  OUTCOME_RECORDED: "FOLLOW_UP_OUTCOME_RECORDED",
  RESOLVED: "FOLLOW_UP_RESOLVED",
  IMPROVED: "FOLLOW_UP_IMPROVED",
  STABLE: "FOLLOW_UP_STABLE",
  WORSENED: "FOLLOW_UP_WORSENED",
  REFERRED: "FOLLOW_UP_REFERRED",
  CONTINUED: "FOLLOW_UP_CONTINUED",
  CHAIN_CREATED: "FOLLOW_UP_CHAIN_CREATED",
};

/**
 * Audit actions for follow-up outcomes.
 */
const AUDIT_ACTIONS = {
  OUTCOME_CREATED: "FOLLOW_UP_OUTCOME_CREATED",
  OUTCOME_UPDATED: "FOLLOW_UP_OUTCOME_UPDATED",
  CHAIN_CREATED: "FOLLOW_UP_CHAIN_CREATED",
  CHAIN_CONTINUED: "FOLLOW_UP_CHAIN_CONTINUED",
};

/**
 * Maps outcome_status to timeline event type.
 */
const OUTCOME_TIMELINE_MAP = {
  RESOLVED: TIMELINE_EVENTS.RESOLVED,
  IMPROVED: TIMELINE_EVENTS.IMPROVED,
  STABLE: TIMELINE_EVENTS.STABLE,
  WORSENED: TIMELINE_EVENTS.WORSENED,
  REFERRED: TIMELINE_EVENTS.REFERRED,
  LOST_TO_FOLLOW_UP: TIMELINE_EVENTS.OUTCOME_RECORDED,
  PATIENT_DECLINED: TIMELINE_EVENTS.OUTCOME_RECORDED,
  OTHER: TIMELINE_EVENTS.OUTCOME_RECORDED,
};

/**
 * Readable outcome labels.
 */
const OUTCOME_LABELS = {
  RESOLVED: "Resolved",
  IMPROVED: "Improved",
  STABLE: "Stable",
  WORSENED: "Worsened",
  REFERRED: "Referred",
  LOST_TO_FOLLOW_UP: "Lost to Follow-up",
  PATIENT_DECLINED: "Patient Declined",
  OTHER: "Other",
};

class FollowUpOutcomeService {
  /**
   * Create a new follow-up outcome.
   * @param {object} data - Outcome data
   * @param {string} data.follow_up_id
   * @param {string} data.encounter_id
   * @param {string} data.outcome_status
   * @param {string} [data.treatment_response]
   * @param {string} [data.resolution_notes]
   * @param {boolean} [data.requires_additional_follow_up]
   * @param {object} [options]
   * @param {object} [options.req] - Express request for audit context
   * @param {string} [options.recordedBy]
   * @returns {Promise<object>}
   */
  async createOutcome(data, options = {}) {
    const { req, recordedBy } = options;

    // Validate the follow-up exists
    const followUp = await EncounterFollowUp.findByPk(data.follow_up_id, {
      paranoid: false,
    });
    if (!followUp) {
      throw Object.assign(new Error("Follow-up not found"), { status: 404 });
    }

    // Validate outcome doesn't already exist (one-to-one)
    const existing = await EncounterFollowUpOutcome.findOne({
      where: { follow_up_id: data.follow_up_id },
    });
    if (existing) {
      throw Object.assign(
        new Error("Outcome already exists for this follow-up. Use PUT to update."),
        { status: 409 }
      );
    }

    const outcome = await EncounterFollowUpOutcome.create({
      follow_up_outcome_id: uuidv4(),
      follow_up_id: data.follow_up_id,
      encounter_id: data.encounter_id,
      outcome_status: data.outcome_status,
      treatment_response: data.treatment_response || null,
      resolution_notes: data.resolution_notes || null,
      requires_additional_follow_up: data.requires_additional_follow_up || false,
      recorded_by: recordedBy || data.recorded_by,
      recorded_at: new Date(),
    });

    const plain = outcome.get({ plain: true });

    // Emit timeline event
    await this._emitOutcomeTimelineEvent(followUp, plain);

    // Audit
    if (req) {
      await recordAudit(req, {
        action: AUDIT_ACTIONS.OUTCOME_CREATED,
        resourceType: "EncounterFollowUpOutcome",
        resourceId: plain.follow_up_outcome_id,
        module: "follow-up",
        next: {
          outcome_status: plain.outcome_status,
          requires_additional_follow_up: plain.requires_additional_follow_up,
        },
        extra: {
          follow_up_id: plain.follow_up_id,
          encounter_id: plain.encounter_id,
          outcome_status: plain.outcome_status,
          requires_additional_follow_up: plain.requires_additional_follow_up,
        },
      });
    }

    // If requires_additional_follow_up, emit FOLLOW_UP_CONTINUED
    if (plain.requires_additional_follow_up) {
      await this._emitTimelineEvent(followUp, TIMELINE_EVENTS.CONTINUED, {
        outcome_status: plain.outcome_status,
        outcome_id: plain.follow_up_outcome_id,
      });
    }

    return this._formatResponse(plain);
  }

  /**
   * Update an existing follow-up outcome.
   * @param {string} outcomeId
   * @param {object} updates
   * @param {object} [options]
   * @param {object} [options.req]
   * @param {string} [options.updatedBy]
   * @returns {Promise<object>}
   */
  async updateOutcome(outcomeId, updates, options = {}) {
    const { req, updatedBy } = options;

    const outcome = await EncounterFollowUpOutcome.findByPk(outcomeId);
    if (!outcome) {
      throw Object.assign(new Error("Outcome not found"), { status: 404 });
    }

    const allowedFields = [
      "outcome_status",
      "treatment_response",
      "resolution_notes",
      "requires_additional_follow_up",
    ];

    const changed = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        changed[field] = updates[field];
      }
    }

    if (Object.keys(changed).length === 0) {
      return this._formatResponse(outcome.get({ plain: true }));
    }

    await outcome.update(changed);

    const plain = outcome.get({ plain: true });

    // Emit timeline event for update
    const followUp = await EncounterFollowUp.findByPk(plain.follow_up_id, {
      paranoid: false,
    });
    if (followUp) {
      await this._emitOutcomeTimelineEvent(followUp, plain);
    }

    // Audit
    if (req) {
      await recordAudit(req, {
        action: AUDIT_ACTIONS.OUTCOME_UPDATED,
        resourceType: "EncounterFollowUpOutcome",
        resourceId: outcomeId,
        module: "follow-up",
        previous: { ...changed },
        next: { outcome_status: plain.outcome_status },
        extra: {
          follow_up_id: plain.follow_up_id,
          updated_fields: Object.keys(changed),
        },
      });
    }

    return this._formatResponse(plain);
  }

  /**
   * Get outcome by follow-up ID.
   * @param {string} followUpId
   * @returns {Promise<object|null>}
   */
  async getOutcome(followUpId) {
    const outcome = await EncounterFollowUpOutcome.findOne({
      where: { follow_up_id: followUpId },
      include: [
        {
          model: User,
          as: "recorder",
          attributes: ["user_id", "full_name"],
        },
        {
          model: StaffAppointment,
          as: "encounter",
          attributes: ["appointment_id", "workflow_status", "workflow_completed_at"],
        },
      ],
    });

    if (!outcome) return null;
    return this._formatResponse(outcome.get({ plain: true }));
  }

  /**
   * Validate whether an outcome is required for a follow-up encounter.
   * Used by the Encounter Completion validation engine.
   * @param {string} appointmentId
   * @returns {Promise<{requiresOutcome: boolean, hasOutcome: boolean, outcome: object|null}>}
   */
  async validateOutcome(appointmentId) {
    // Get continuity context to check if this is a follow-up encounter
    const continuity = await followUpContinuityService.getFollowUpContext(appointmentId);

    if (!continuity.is_follow_up) {
      return { requiresOutcome: false, hasOutcome: false, outcome: null };
    }

    // Check if outcome exists for this follow-up
    const outcome = await EncounterFollowUpOutcome.findOne({
      where: { follow_up_id: continuity.follow_up_id },
    });

    return {
      requiresOutcome: true,
      hasOutcome: !!outcome,
      outcome: outcome ? this._formatResponse(outcome.get({ plain: true })) : null,
    };
  }

  /**
   * Create the next follow-up in a chain from the current follow-up.
   * Reuses EncounterFollowUpService.createFollowUp() and links parent.
   * Does NOT duplicate scheduling logic.
   * @param {string} parentFollowUpId
   * @param {object} followUpData - Standard createFollowUp data
   * @param {object} [options]
   * @param {object} [options.req]
   * @returns {Promise<object>}
   */
  async createNextFollowUp(parentFollowUpId, followUpData, options = {}) {
    const { req } = options;

    const parent = await EncounterFollowUp.findByPk(parentFollowUpId, {
      paranoid: false,
    });
    if (!parent) {
      throw Object.assign(new Error("Parent follow-up not found"), { status: 404 });
    }

    // Inherit patient from parent if not specified
    if (!followUpData.patient_id) {
      followUpData.patient_id = parent.patient_id;
    }

    // Create the new follow-up using existing service
    const newFollowUp = await encounterFollowUpService.createFollowUp(followUpData, { req });

    // Link as child of parent
    await newFollowUp.update({ parent_follow_up_id: parentFollowUpId });

    const plain = newFollowUp.get({ plain: true });

    // Emit chain created timeline event on parent
    await this._emitTimelineEvent(parent, TIMELINE_EVENTS.CHAIN_CREATED, {
      child_follow_up_id: plain.follow_up_id,
      child_reason: plain.reason,
    });

    // Emit chain created timeline event on child
    await this._emitTimelineEvent(plain, TIMELINE_EVENTS.CHAIN_CREATED, {
      parent_follow_up_id: parentFollowUpId,
      parent_reason: parent.reason,
    });

    // Audit chain creation
    if (req) {
      await recordAudit(req, {
        action: AUDIT_ACTIONS.CHAIN_CREATED,
        resourceType: "EncounterFollowUp",
        resourceId: plain.follow_up_id,
        module: "follow-up",
        next: { status: plain.status, parent_follow_up_id: parentFollowUpId },
        extra: {
          parent_follow_up_id: parentFollowUpId,
          child_follow_up_id: plain.follow_up_id,
          reason: plain.reason,
        },
      });

      await recordAudit(req, {
        action: AUDIT_ACTIONS.CHAIN_CONTINUED,
        resourceType: "EncounterFollowUp",
        resourceId: parentFollowUpId,
        module: "follow-up",
        next: { child_follow_up_id: plain.follow_up_id },
        extra: {
          parent_follow_up_id: parentFollowUpId,
          child_follow_up_id: plain.follow_up_id,
        },
      });
    }

    return this._formatResponse(plain);
  }

  /**
   * Build the full follow-up chain for a given follow-up.
   * Traverses parent references to root and child references to leaf.
   * @param {string} followUpId
   * @returns {Promise<object[]>}
   */
  async buildFollowUpChain(followUpId) {
    const chain = [];

    // 1. Traverse to root
    const rootPath = [];
    let current = await EncounterFollowUp.findByPk(followUpId, {
      include: [
        { model: EncounterFollowUpOutcome, as: "outcome" },
        { model: StaffAppointment, as: "appointment", attributes: ["appointment_id", "workflow_status"] },
        { model: StaffAppointment, as: "completedEncounter", attributes: ["appointment_id", "workflow_status"] },
        { model: EncounterFollowUp, as: "parentFollowUp", attributes: ["follow_up_id", "status"] },
      ],
      paranoid: false,
    });

    if (!current) return [];

    // Collect the chain from root to current
    const allNodes = [];
    const visited = new Set();

    // Walk to root
    let walker = current;
    while (walker) {
      if (visited.has(walker.follow_up_id)) break;
      visited.add(walker.follow_up_id);
      allNodes.unshift(walker);
      if (walker.parentFollowUp) {
        walker = walker.parentFollowUp;
      } else {
        walker = null;
      }
    }

    // Walk children from current
    walker = current;
    while (walker) {
      const children = await EncounterFollowUp.findAll({
        where: { parent_follow_up_id: walker.follow_up_id },
        include: [
          { model: EncounterFollowUpOutcome, as: "outcome" },
          { model: StaffAppointment, as: "appointment", attributes: ["appointment_id", "workflow_status"] },
          { model: StaffAppointment, as: "completedEncounter", attributes: ["appointment_id", "workflow_status"] },
        ],
        paranoid: false,
      });
      if (children.length === 0) break;
      const child = children[0];
      if (visited.has(child.follow_up_id)) break;
      visited.add(child.follow_up_id);
      allNodes.push(child);
      walker = child;
    }

    return allNodes.map((node) => ({
      follow_up_id: node.follow_up_id,
      status: node.status,
      reason: node.reason,
      priority: node.priority,
      recommended_date: node.recommended_date,
      target_date: node.target_date,
      clinical_instructions: node.clinical_instructions,
      parent_follow_up_id: node.parent_follow_up_id,
      appointment_id: node.appointment_id,
      completed_encounter_id: node.completed_encounter_id,
      outcome: node.outcome
        ? {
            outcome_status: node.outcome.outcome_status,
            treatment_response: node.outcome.treatment_response,
            resolution_notes: node.outcome.resolution_notes,
            requires_additional_follow_up: node.outcome.requires_additional_follow_up,
            recorded_at: node.outcome.recorded_at,
          }
        : null,
    }));
  }

  // ============ Analytics Support ============

  /**
   * Get outcome distribution counts.
   * @returns {Promise<object>}
   */
  async getOutcomeDistribution() {
    const counts = await EncounterFollowUpOutcome.findAll({
      attributes: [
        "outcome_status",
        [db.sequelize.fn("COUNT", db.sequelize.col("follow_up_outcome_id")), "count"],
      ],
      group: ["outcome_status"],
      raw: true,
    });

    const result = {
      RESOLVED: 0,
      IMPROVED: 0,
      STABLE: 0,
      WORSENED: 0,
      REFERRED: 0,
      LOST_TO_FOLLOW_UP: 0,
      PATIENT_DECLINED: 0,
      OTHER: 0,
    };

    for (const row of counts) {
      result[row.outcome_status] = Number(row.count) || 0;
    }
    return result;
  }

  /**
   * Get resolution rate (RESOLVED + IMPROVED / total).
   * @returns {Promise<number>}
   */
  async getResolutionRate() {
    const total = await EncounterFollowUpOutcome.count();
    if (total === 0) return 0;
    const resolved = await EncounterFollowUpOutcome.count({
      where: { outcome_status: { [db.Sequelize.Op.in]: ["RESOLVED", "IMPROVED"] } },
    });
    return Math.round((resolved / total) * 100);
  }

  /**
   * Get worsened rate.
   * @returns {Promise<number>}
   */
  async getWorsenedRate() {
    const total = await EncounterFollowUpOutcome.count();
    if (total === 0) return 0;
    const worsened = await EncounterFollowUpOutcome.count({
      where: { outcome_status: "WORSENED" },
    });
    return Math.round((worsened / total) * 100);
  }

  /**
   * Get referral rate.
   * @returns {Promise<number>}
   */
  async getReferralRate() {
    const total = await EncounterFollowUpOutcome.count();
    if (total === 0) return 0;
    const referred = await EncounterFollowUpOutcome.count({
      where: { outcome_status: "REFERRED" },
    });
    return Math.round((referred / total) * 100);
  }

  /**
   * Get lost to follow-up rate.
   * @returns {Promise<number>}
   */
  async getLostFollowUpRate() {
    const total = await EncounterFollowUpOutcome.count();
    if (total === 0) return 0;
    const lost = await EncounterFollowUpOutcome.count({
      where: { outcome_status: "LOST_TO_FOLLOW_UP" },
    });
    return Math.round((lost / total) * 100);
  }

  /**
   * Get average resolution time in days.
   * @returns {Promise<number|null>}
   */
  async getAverageResolutionTime() {
    const outcomes = await EncounterFollowUpOutcome.findAll({
      where: {
        outcome_status: { [db.Sequelize.Op.in]: ["RESOLVED", "IMPROVED"] },
      },
      include: [
        {
          model: EncounterFollowUp,
          as: "followUp",
          attributes: ["recommended_date"],
          paranoid: false,
        },
      ],
      raw: true,
      nest: true,
    });

    if (outcomes.length === 0) return null;

    let totalDays = 0;
    let count = 0;
    for (const row of outcomes) {
      if (row.followUp?.recommended_date && row.recorded_at) {
        const start = new Date(row.followUp.recommended_date);
        const end = new Date(row.recorded_at);
        const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
        totalDays += days;
        count++;
      }
    }

    return count > 0 ? Math.round(totalDays / count) : null;
  }

  /**
   * Get follow-ups per provider.
   * @returns {Promise<object[]>}
   */
  async getFollowUpsPerProvider() {
    const results = await EncounterFollowUpOutcome.findAll({
      attributes: [
        "recorded_by",
        [db.sequelize.fn("COUNT", db.sequelize.col("follow_up_outcome_id")), "count"],
      ],
      include: [
        {
          model: User,
          as: "recorder",
          attributes: ["user_id", "full_name"],
        },
      ],
      group: ["recorded_by", "recorder.user_id", "recorder.full_name"],
      raw: true,
      nest: true,
    });

    return results.map((r) => ({
      user_id: r.recorded_by,
      full_name: r.recorder?.full_name || "Unknown",
      count: Number(r.count) || 0,
    }));
  }

  /**
   * Get average follow-up chain length.
   * @returns {Promise<number>}
   */
  async getAverageChainLength() {
    const result = await db.sequelize.query(
      `SELECT AVG(chain_length)::float as avg_length FROM (
        SELECT COUNT(*) as chain_length FROM (
          SELECT follow_up_id, parent_follow_up_id
          FROM encounter_follow_ups
          WHERE parent_follow_up_id IS NOT NULL
        ) linked
        GROUP BY parent_follow_up_id
      ) chains`,
      { type: db.sequelize.QueryTypes.SELECT }
    );
    return result[0]?.avg_length || 0;
  }

  /**
   * Get follow-ups per specialty (via assigned_department_id).
   * @returns {Promise<object[]>}
   */
  async getFollowUpsPerSpecialty() {
    const results = await EncounterFollowUpOutcome.findAll({
      attributes: [
        [db.sequelize.col("followUp.assigned_department_id"), "department_id"],
        [db.sequelize.fn("COUNT", db.sequelize.col("follow_up_outcome_id")), "count"],
      ],
      include: [
        {
          model: EncounterFollowUp,
          as: "followUp",
          attributes: [],
          include: [
            {
              model: db.Department,
              as: "assignedDepartment",
              attributes: ["name"],
            },
          ],
          paranoid: false,
        },
      ],
      group: ["followUp.assigned_department_id", "followUp.assignedDepartment.name"],
      raw: true,
      nest: true,
    });

    return results.map((r) => ({
      department_id: r.followUp?.assigned_department_id || null,
      department_name: r.followUp?.assignedDepartment?.name || "Unassigned",
      count: Number(r.count) || 0,
    }));
  }

  // ============ Internal Helpers ============

  /**
   * Emit timeline event for outcome recording with specific event type based on status.
   */
  async _emitOutcomeTimelineEvent(followUp, outcome) {
    const eventType = OUTCOME_TIMELINE_MAP[outcome.outcome_status] || TIMELINE_EVENTS.OUTCOME_RECORDED;
    const label = OUTCOME_LABELS[outcome.outcome_status] || outcome.outcome_status;

    await this._emitTimelineEvent(followUp, eventType, {
      outcome_status: outcome.outcome_status,
      outcome_id: outcome.follow_up_outcome_id,
      outcome_label: label,
      encounter_id: outcome.encounter_id,
      requires_additional_follow_up: outcome.requires_additional_follow_up,
    });
  }

  /**
   * Emit a timeline event for the follow-up.
   */
  async _emitTimelineEvent(followUp, eventType, extra = {}) {
    if (!eventType) return;

    const titles = {
      FOLLOW_UP_OUTCOME_RECORDED: "Follow-up Outcome Recorded",
      FOLLOW_UP_RESOLVED: "Follow-up Resolved",
      FOLLOW_UP_IMPROVED: "Follow-up Improved",
      FOLLOW_UP_STABLE: "Follow-up Stable",
      FOLLOW_UP_WORSENED: "Follow-up Worsened",
      FOLLOW_UP_REFERRED: "Follow-up Referred",
      FOLLOW_UP_CONTINUED: "Follow-up Continued",
      FOLLOW_UP_CHAIN_CREATED: "Follow-up Chain Created",
    };

    const label = extra.outcome_label || "";
    const descriptions = {
      FOLLOW_UP_OUTCOME_RECORDED: `Follow-up outcome recorded: ${label}`,
      FOLLOW_UP_RESOLVED: `Follow-up resolved: ${label}`,
      FOLLOW_UP_IMPROVED: `Follow-up improved: ${label}`,
      FOLLOW_UP_STABLE: `Follow-up stable: ${label}`,
      FOLLOW_UP_WORSENED: `Follow-up worsened: ${label}`,
      FOLLOW_UP_REFERRED: `Follow-up referred: ${label}`,
      FOLLOW_UP_CONTINUED: `Follow-up continuing: ${label}. Additional follow-up required.`,
      FOLLOW_UP_CHAIN_CREATED: extra.child_follow_up_id
        ? `New follow-up created in chain (${extra.child_reason || "No reason"})`
        : "Follow-up chain created",
    };

    try {
      await timelineEventService.emit({
        patient_id: followUp.patient_id,
        appointment_id: followUp.appointment_id,
        event_type: eventType,
        title: titles[eventType] || eventType,
        description: descriptions[eventType] || "",
        event_date: new Date(),
        actor_id: followUp.updated_by || followUp.recommended_by,
        resource_type: "EncounterFollowUpOutcome",
        resource_id: extra.outcome_id || followUp.follow_up_id,
        metadata: {
          follow_up_id: followUp.follow_up_id,
          ...extra,
        },
      });
    } catch (err) {
      console.error("Failed to emit follow-up outcome timeline event:", err.message);
    }
  }

  /**
   * Format response.
   */
  _formatResponse(plain) {
    return {
      ...plain,
    };
  }
}

module.exports = new FollowUpOutcomeService();