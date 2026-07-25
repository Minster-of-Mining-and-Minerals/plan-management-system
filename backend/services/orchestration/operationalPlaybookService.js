"use strict";

const db = require("../../models");
const auditService = require("../auditService");
const timelineEventService = require("../timelineEventService");

class OperationalPlaybookService {
  /**
   * Get operational playbooks for a specific incident type.
   */
  async getPlaybooks(incidentType = null) {
    const defaultPlaybooks = [
      {
        playbook_id: "pb-rad-01",
        incident_type: "RADIOLOGY_BACKLOG",
        title: "Radiology Backlog Response Playbook",
        description: "Standard operating playbook to resolve radiology exam backlogs and SLA risks.",
        steps: [
          { step_id: 1, title: "Increase Imaging Staffing", type: "MANUAL", status: "PENDING" },
          { step_id: 2, title: "Reallocate Diagnostic Rooms", type: "AUTOMATIC", status: "PENDING" },
          { step_id: 3, title: "Prioritize STAT Exams", type: "APPROVAL_REQUIRED", status: "PENDING" },
          { step_id: 4, title: "Notify Radiology Supervisor", type: "AUTOMATIC", status: "PENDING" },
        ],
      },
      {
        playbook_id: "pb-sla-02",
        incident_type: "SLA_BREACH",
        title: "SLA Recovery Response Playbook",
        description: "Playbook for escalating and clearing overdue clinical orders.",
        steps: [
          { step_id: 1, title: "Audit Overdue Clinical Orders", type: "AUTOMATIC", status: "PENDING" },
          { step_id: 2, title: "Reassign Processor to Overdue Queue", type: "AUTOMATIC", status: "PENDING" },
          { step_id: 3, title: "Notify Operations Manager", type: "AUTOMATIC", status: "PENDING" },
        ],
      },
    ];

    if (db.ClinicalPlaybook) {
      try {
        const where = { is_active: true };
        if (incidentType) where.incident_type = incidentType;
        const dbPlaybooks = await db.ClinicalPlaybook.findAll({ where });
        if (dbPlaybooks.length > 0) {
          return dbPlaybooks.map((p) => p.get({ plain: true }));
        }
      } catch (e) {
        // Fallback to defaults
      }
    }

    if (incidentType) {
      return defaultPlaybooks.filter((p) => p.incident_type === incidentType);
    }
    return defaultPlaybooks;
  }

  /**
   * Execute or mark a step in a playbook as COMPLETED.
   */
  async executePlaybookStep({ playbook_id, step_id, incident_id = null }, actorUserId = null) {
    if (actorUserId) {
      await auditService.logAudit({
        actorUserId,
        action: "operations:playbook_execute_step",
        resourceType: "PLAYBOOK",
        details: { playbook_id, step_id, incident_id },
      });
    }

    if (timelineEventService && typeof timelineEventService.emit === "function") {
      try {
        await timelineEventService.emit({
          event_type: "PLAYBOOK_STEP_EXECUTED",
          title: `Playbook Step Executed: Step #${step_id}`,
          notes: `Step #${step_id} in Playbook #${playbook_id} executed`,
          domain: "OPERATIONS",
        });
      } catch (e) {
        // Silently capture timeline error
      }
    }

    return {
      playbook_id,
      step_id,
      incident_id,
      status: "COMPLETED",
      executed_at: new Date().toISOString(),
    };
  }
}

module.exports = new OperationalPlaybookService();
