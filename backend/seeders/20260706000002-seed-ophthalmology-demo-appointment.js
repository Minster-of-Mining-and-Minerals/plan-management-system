"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const { copyStructure, clearTargetStructure } = require("../services/diagnosisStructureCopy");
const { assertDemoSeedAllowed } = require("../utils/assertDemoSeedAllowed");
const {
  ADMIN_USER_ID,
  DEMO_SCHEDULE_ID,
  DEMO_APPOINTMENT_ID,
  DEMO_NURSE_LOG_ID,
  DEMO_FORWARD_LOG_ID,
  DEMO_WORKFLOW_TASK_ID,
  DEMO_PATIENT_EMAIL,
  RECEPTION_STAFF_ID,
  OPHTHALMOLOGIST_STAFF_ID,
  NURSE_STAFF_ID,
  LAB_STAFF_ID,
} = require("../config/clinicalDemoSeedConstants");
const { OPHTHALMOLOGY_LAB_TEMPLATE_TITLE } = require("../config/ophthalmologyLabReportPreset");

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

async function findUserIdByEmail(queryInterface, email) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT user_id FROM users WHERE email = :email LIMIT 1`,
    { replacements: { email } }
  );
  return rows[0]?.user_id || null;
}

async function findConfigId(queryInterface, staffId, title) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT config_id FROM diagnosis_form_configs
     WHERE assigned_staff_id = :staffId AND title = :title LIMIT 1`,
    { replacements: { staffId, title } }
  );
  return rows[0]?.config_id || null;
}

async function findTemplateId(queryInterface, title) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT template_id FROM diagnosis_templates WHERE title = :title LIMIT 1`,
    { replacements: { title } }
  );
  return rows[0]?.template_id || null;
}

async function ensureOphthalmologyLabStaffConfig(queryInterface, now) {
  const templateId = await findTemplateId(
    queryInterface,
    OPHTHALMOLOGY_LAB_TEMPLATE_TITLE
  );
  if (!templateId) {
    console.warn(
      "[oph-demo-appointment] Ophthalmology Laboratory Report template missing — run migrations first"
    );
    return null;
  }

  const configTitle = "Laboratory & Investigation Report";
  let configId = await findConfigId(queryInterface, LAB_STAFF_ID, configTitle);

  const [[{ field_count }]] = await queryInterface.sequelize.query(
    `SELECT COUNT(*)::int AS field_count FROM form_fields
     WHERE diagnosis_config_id = :configId AND field_key = 'oph_lab_ordered_tests'`,
    { replacements: { configId: configId || "00000000-0000-0000-0000-000000000000" } }
  );

  if (configId && Number(field_count) > 0) return configId;

  const t = await db.sequelize.transaction();
  try {
    if (!configId) {
      configId = uuidv4();
      await queryInterface.bulkInsert(
        "diagnosis_form_configs",
        [
          {
            config_id: configId,
            assigned_staff_id: LAB_STAFF_ID,
            title: configTitle,
            description: "Ophthalmology laboratory investigation report",
            is_active: true,
            created_by: ADMIN_USER_ID,
            updated_by: ADMIN_USER_ID,
            created_at: now,
            updated_at: now,
          },
        ],
        { transaction: t }
      );
    } else {
      await clearTargetStructure({ configId, transaction: t });
    }

    await copyStructure({
      sourceTemplateId: templateId,
      targetConfigId: configId,
      transaction: t,
    });

    await t.commit();
    return configId;
  } catch (e) {
    if (!t.finished) await t.rollback();
    throw e;
  }
}

async function ensureDemoAppointment(queryInterface, now, patientId) {
  const scheduleDate = todayDateOnly();
  const admittedAt = now;

  const [existingSchedule] = await queryInterface.sequelize.query(
    `SELECT schedule_id FROM patient_schedules WHERE schedule_id = :id LIMIT 1`,
    { replacements: { id: DEMO_SCHEDULE_ID } }
  );

  if (existingSchedule.length) {
    await queryInterface.sequelize.query(
      `UPDATE patient_schedules SET
         schedule_date = :scheduleDate,
         status = 'admitted',
         updated_at = :now
       WHERE schedule_id = :id`,
      { replacements: { scheduleDate, now, id: DEMO_SCHEDULE_ID } }
    );
  } else {
    await queryInterface.bulkInsert("patient_schedules", [
      {
        schedule_id: DEMO_SCHEDULE_ID,
        patient_id: patientId,
        assigned_staff_id: OPHTHALMOLOGIST_STAFF_ID,
        schedule_date: scheduleDate,
        start_time: "09:00",
        end_time: "09:05",
        status: "admitted",
        appointment_type: "Ophthalmology follow-up",
        notes: "Demo visit — diabetic eye screening and comprehensive exam",
        created_by: RECEPTION_STAFF_ID,
        updated_by: RECEPTION_STAFF_ID,
        created_at: now,
        updated_at: now,
      },
    ]);
  }

  const [existingAppt] = await queryInterface.sequelize.query(
    `SELECT appointment_id FROM staff_appointments WHERE appointment_id = :id LIMIT 1`,
    { replacements: { id: DEMO_APPOINTMENT_ID } }
  );

  if (existingAppt.length) {
    await queryInterface.sequelize.query(
      `UPDATE staff_appointments SET
         admitted_at = :admittedAt,
         status = 'admitted',
         workflow_status = 'active',
         workflow_completed_at = NULL,
         updated_at = :now
       WHERE appointment_id = :id`,
      { replacements: { admittedAt, now, id: DEMO_APPOINTMENT_ID } }
    );
  } else {
    await queryInterface.bulkInsert("staff_appointments", [
      {
        appointment_id: DEMO_APPOINTMENT_ID,
        schedule_id: DEMO_SCHEDULE_ID,
        patient_id: patientId,
        assigned_staff_id: OPHTHALMOLOGIST_STAFF_ID,
        admitted_by: RECEPTION_STAFF_ID,
        admitted_at: admittedAt,
        status: "admitted",
        workflow_status: "active",
        workflow_completed_at: null,
        notes: "Seeded demo appointment for ophthalmology workflow walkthrough",
        created_at: now,
        updated_at: now,
      },
    ]);
  }

  return DEMO_APPOINTMENT_ID;
}

async function ensureDemoWorkflow(queryInterface, now, patientId, appointmentId) {
  const [[{ log_count }]] = await queryInterface.sequelize.query(
    `SELECT COUNT(*)::int AS log_count FROM medical_history_logs
     WHERE appointment_id = :appointmentId`,
    { replacements: { appointmentId } }
  );
  if (Number(log_count) > 0) return;

  const nurseConfigId = await findConfigId(
    queryInterface,
    NURSE_STAFF_ID,
    "Ophthalmic Nursing Assessment"
  );
  const ophConfigId = await findConfigId(
    queryInterface,
    OPHTHALMOLOGIST_STAFF_ID,
    "Ophthalmology Comprehensive Examination"
  );

  await queryInterface.bulkInsert("medical_history_logs", [
    {
      log_id: DEMO_NURSE_LOG_ID,
      patient_id: patientId,
      appointment_id: appointmentId,
      sender_staff_id: NURSE_STAFF_ID,
      receiver_staff_id: null,
      action_type: "submit",
      header_title: "Ophthalmic nursing assessment",
      form_config_id: nurseConfigId,
      form_data: JSON.stringify({
        allergies_documented: "Penicillin (documented on intake)",
        pain_score: 2,
        nurse_blood_pressure: "128/82",
        nurse_temperature: 36.8,
        mobility_status: "Independent",
        fall_risk: "Low",
        nursing_care_notes:
          "Patient reports mild blurred vision OD for 2 weeks. Vitals stable.",
      }),
      attachment_ids: JSON.stringify([]),
      notes: null,
      status: "submitted",
      parent_log_id: null,
      created_at: now,
      updated_at: now,
    },
    {
      log_id: DEMO_FORWARD_LOG_ID,
      patient_id: patientId,
      appointment_id: appointmentId,
      sender_staff_id: OPHTHALMOLOGIST_STAFF_ID,
      receiver_staff_id: LAB_STAFF_ID,
      action_type: "forward",
      header_title: "Lab investigations — diabetic eye screening",
      form_config_id: ophConfigId,
      form_data: JSON.stringify({
        investigations_plan:
          "FBS, HbA1c, lipid profile, renal function (creatinine, urea), ESR, CRP",
        oph_lab_ordered_tests:
          "FBS, HbA1c, lipid profile, creatinine, urea, ESR, CRP",
        oph_lab_clinical_indication:
          "Type 2 DM with early diabetic retinopathy — metabolic workup",
      }),
      attachment_ids: JSON.stringify([]),
      notes: "Please process labs and return report to ophthalmology.",
      status: "forwarded",
      parent_log_id: DEMO_NURSE_LOG_ID,
      created_at: new Date(now.getTime() + 60000),
      updated_at: new Date(now.getTime() + 60000),
    },
  ]);

  await queryInterface.bulkInsert("workflow_tasks", [
    {
      task_id: DEMO_WORKFLOW_TASK_ID,
      appointment_id: appointmentId,
      patient_id: patientId,
      assignee_staff_id: LAB_STAFF_ID,
      assigned_by_staff_id: OPHTHALMOLOGIST_STAFF_ID,
      medical_log_id: DEMO_FORWARD_LOG_ID,
      status: "pending",
      created_at: new Date(now.getTime() + 60000),
      updated_at: new Date(now.getTime() + 60000),
    },
  ]);
}

module.exports = {
  async up(queryInterface) {
    if (!assertDemoSeedAllowed("ophthalmology-demo-appointment")) return;
    const now = new Date();

    await ensureOphthalmologyLabStaffConfig(queryInterface, now);

    const patientId = await findUserIdByEmail(queryInterface, DEMO_PATIENT_EMAIL);
    if (!patientId) {
      console.warn(
        `[oph-demo-appointment] Patient not found (${DEMO_PATIENT_EMAIL}) — run sample-patients seeder first`
      );
      return;
    }

    const appointmentId = await ensureDemoAppointment(
      queryInterface,
      now,
      patientId
    );
    await ensureDemoWorkflow(queryInterface, now, patientId, appointmentId);

    console.log(
      `[oph-demo-appointment] Demo visit ready for ${todayDateOnly()} — appointment ${appointmentId}`
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("workflow_tasks", {
      task_id: DEMO_WORKFLOW_TASK_ID,
    });
    await queryInterface.bulkDelete("medical_history_logs", {
      log_id: [DEMO_NURSE_LOG_ID, DEMO_FORWARD_LOG_ID],
    });
    await queryInterface.bulkDelete("staff_appointments", {
      appointment_id: DEMO_APPOINTMENT_ID,
    });
    await queryInterface.bulkDelete("patient_schedules", {
      schedule_id: DEMO_SCHEDULE_ID,
    });
  },
};
