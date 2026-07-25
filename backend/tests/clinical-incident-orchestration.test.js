"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const clinicalIncidentEngine = require("../services/orchestration/clinicalIncidentEngine");
const clinicalOperationalRulesEngine = require("../services/orchestration/clinicalOperationalRulesEngine");
const incidentAssignmentEngine = require("../services/orchestration/incidentAssignmentEngine");
const operationalPlaybookService = require("../services/orchestration/operationalPlaybookService");
const hospitalAutomationEngine = require("../services/orchestration/hospitalAutomationEngine");
const crossDomainCoordinator = require("../services/orchestration/crossDomainCoordinator");
const operationalCommunicationHub = require("../services/orchestration/operationalCommunicationHub");
const incidentAnalyticsService = require("../services/orchestration/incidentAnalyticsService");
const executiveIncidentDashboardService = require("../services/orchestration/executiveIncidentDashboardService");

jest.setTimeout(30000);

describe("Phase 2.10.3 — Enterprise Clinical Orchestration, Incident Management & Operational Automation", () => {
  let adminId;
  let doctorId;
  let patientId;
  let incidentId;

  beforeAll(async () => {
    await db.ClinicalIncident.sync({ alter: true });
    await db.ClinicalIncidentRule.sync({ alter: true });
    await db.ClinicalPlaybook.sync({ alter: true });
    await db.ClinicalOperationalMessage.sync({ alter: true });

    const admin = await db.User.create({
      user_id: uuidv4(),
      full_name: "Incident Admin",
      email: `inc_admin_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    adminId = admin.user_id;

    const doctor = await db.User.create({
      user_id: uuidv4(),
      full_name: "Dr. Orchestration Chief",
      email: `orch_chief_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    doctorId = doctor.user_id;

    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Orchestration Patient",
      email: `orch_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientId = patient.user_id;
  });

  describe("1. Enterprise Incident Engine", () => {
    it("should create an operational incident", async () => {
      const inc = await clinicalIncidentEngine.createIncident(
        {
          title: "Test SLA Breach Incident",
          incident_type: "SLA_BREACH",
          severity: "HIGH",
          department_id: "LABORATORY",
        },
        adminId
      );

      expect(inc).toBeDefined();
      expect(inc.incident_id).toBeDefined();
      expect(inc.status).toBe("OPEN");
      incidentId = inc.incident_id;
    });

    it("should update incident status through lifecycle (ACKNOWLEDGED -> RESOLVED -> CLOSED)", async () => {
      const ack = await clinicalIncidentEngine.updateIncidentStatus(incidentId, "ACKNOWLEDGED", {}, adminId);
      expect(ack.status).toBe("ACKNOWLEDGED");
      expect(ack.acknowledged_at).toBeDefined();

      const res = await clinicalIncidentEngine.updateIncidentStatus(
        incidentId,
        "RESOLVED",
        { resolution_notes: "Staff reallocated to clear backlog", root_cause: "Sudden order volume spike" },
        adminId
      );
      expect(res.status).toBe("RESOLVED");
      expect(res.resolved_at).toBeDefined();

      const closed = await clinicalIncidentEngine.updateIncidentStatus(incidentId, "CLOSED", {}, adminId);
      expect(closed.status).toBe("CLOSED");
      expect(closed.closed_at).toBeDefined();
    });

    it("should list operational incidents", async () => {
      const list = await clinicalIncidentEngine.getIncidents();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("2. Operational Rules Engine", () => {
    it("should evaluate operational rules and generate automated incidents", async () => {
      const evalRes = await clinicalOperationalRulesEngine.evaluateOperationalRules();
      expect(evalRes).toBeDefined();
      expect(typeof evalRes.triggered_incidents_count).toBe("number");
    });
  });

  describe("3. Incident Assignment Engine", () => {
    it("should assign incident to user and role", async () => {
      const inc = await clinicalIncidentEngine.createIncident(
        { title: "Unassigned Equipment Incident", incident_type: "EQUIPMENT_UNAVAILABLE" },
        adminId
      );
      const assigned = await incidentAssignmentEngine.assignIncident(
        inc.incident_id,
        { assigned_to_user_id: doctorId, assigned_owner_role: "RADIOLOGY_SUPERVISOR" },
        adminId
      );

      expect(assigned.assigned_to_user_id).toBe(doctorId);
      expect(assigned.assigned_owner_role).toBe("RADIOLOGY_SUPERVISOR");
    });

    it("should suggest appropriate owner role based on department", () => {
      const role1 = incidentAssignmentEngine.getSuggestedOwnerRole("SAFETY_INCIDENT", "HOSPITAL");
      expect(role1).toBe("CHIEF_MEDICAL_OFFICER");

      const role2 = incidentAssignmentEngine.getSuggestedOwnerRole("LAB_BACKLOG", "LABORATORY");
      expect(role2).toBe("LABORATORY_SUPERVISOR");
    });
  });

  describe("4. Operational Playbooks Service", () => {
    it("should retrieve operational response playbooks", async () => {
      const playbooks = await operationalPlaybookService.getPlaybooks();
      expect(Array.isArray(playbooks)).toBe(true);
      expect(playbooks.length).toBeGreaterThanOrEqual(1);
    });

    it("should execute a playbook step and emit timeline event", async () => {
      const res = await operationalPlaybookService.executePlaybookStep({ playbook_id: "pb-rad-01", step_id: 1, incident_id: incidentId }, adminId);
      expect(res.status).toBe("COMPLETED");
    });
  });

  describe("5. Hospital Automation Engine", () => {
    it("should translate recommendation action into executed resource allocation", async () => {
      const autoRes = await hospitalAutomationEngine.executeAutomationAction(
        { recommendation_id: "rec-cap-01", action_type: "OPEN_ROOM", target_resource_type: "ROOM", target_resource_id: uuidv4() },
        adminId
      );

      expect(autoRes).toBeDefined();
      expect(autoRes.status).toBe("EXECUTED");
    });
  });

  describe("6. Cross-Domain Coordinator", () => {
    it("should evaluate downstream impact across departments when delays occur", async () => {
      const coord = await crossDomainCoordinator.evaluateCrossDomainImpact(
        { source_department: "LABORATORY", delay_minutes: 45, patient_id: patientId },
        adminId
      );

      expect(coord).toBeDefined();
      expect(coord.downstream_impact_count).toBeGreaterThan(0);
      expect(coord.downstream_actions.length).toBeGreaterThan(0);
    });
  });

  describe("7. Operational Communication Hub", () => {
    it("should broadcast operational communication message", async () => {
      const msg = await operationalCommunicationHub.sendMessage(
        { recipient_role: "OPERATIONS_MANAGER", message_type: "ESCALATION", content: "STAT radiology backlog escalating" },
        adminId
      );

      expect(msg).toBeDefined();
      expect(msg.content).toContain("STAT radiology backlog");
    });

    it("should list operational messages", async () => {
      const msgs = await operationalCommunicationHub.getMessages();
      expect(Array.isArray(msgs)).toBe(true);
      expect(msgs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("8. Incident Analytics & Executive Dashboard", () => {
    it("should compute incident analytics and mean resolution time", async () => {
      const analytics = await incidentAnalyticsService.getIncidentAnalytics();
      expect(analytics).toBeDefined();
      expect(typeof analytics.mean_resolution_time_minutes).toBe("number");
      expect(analytics.automation_effectiveness_pct).toBeGreaterThan(0);
    });

    it("should aggregate executive incident dashboard with operational health score", async () => {
      const exec = await executiveIncidentDashboardService.getExecutiveIncidentSummary(adminId);
      expect(exec).toBeDefined();
      expect(typeof exec.operational_health_score).toBe("number");
      expect(Array.isArray(exec.departments_at_risk)).toBe(true);
    });
  });
});
