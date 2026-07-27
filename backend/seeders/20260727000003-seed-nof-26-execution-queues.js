"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const queues = [
      {
        queue_id: "10000000-0000-0000-0000-000000000001",
        queue_code: "CENTRAL_LAB_QUEUE",
        queue_name: "Central Laboratory Work Queue",
        queue_type: "DEPARTMENT",
        priority: 10,
        is_active: true,
        is_claimable: true,
        sla_minutes: 45,
        metadata: JSON.stringify({ category: "diagnostic", stat_supported: true }),
        created_at: now,
        updated_at: now,
      },
      {
        queue_id: "10000000-0000-0000-0000-000000000002",
        queue_code: "RADIOLOGY_IMAGING_QUEUE",
        queue_name: "Radiology Imaging Work Queue",
        queue_type: "DEPARTMENT",
        priority: 10,
        is_active: true,
        is_claimable: true,
        sla_minutes: 60,
        metadata: JSON.stringify({ category: "imaging", modalities: ["X-RAY", "US", "CT", "MRI"] }),
        created_at: now,
        updated_at: now,
      },
      {
        queue_id: "10000000-0000-0000-0000-000000000003",
        queue_code: "PHARMACY_DISPENSING_QUEUE",
        queue_name: "Pharmacy Dispensing Work Queue",
        queue_type: "DEPARTMENT",
        priority: 10,
        is_active: true,
        is_claimable: true,
        sla_minutes: 30,
        metadata: JSON.stringify({ category: "pharmacy" }),
        created_at: now,
        updated_at: now,
      },
      {
        queue_id: "10000000-0000-0000-0000-000000000004",
        queue_code: "TRIAGE_NURSING_QUEUE",
        queue_name: "Triage & Nursing Care Pool",
        queue_type: "SPECIALTY_TEAM",
        priority: 5,
        is_active: true,
        is_claimable: true,
        sla_minutes: 15,
        metadata: JSON.stringify({ category: "triage" }),
        created_at: now,
        updated_at: now,
      },
    ];

    for (const q of queues) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT queue_id FROM execution_queues WHERE queue_code = '${q.queue_code}'`
      );
      if (existing.length === 0) {
        await queryInterface.bulkInsert("execution_queues", [q]);
      }
    }

    const locations = [
      {
        location_id: "20000000-0000-0000-0000-000000000001",
        location_type: "WAITING_ROOM",
        building: "Main Building",
        floor: "Ground Floor",
        room: "Reception Waiting Area A",
        display_name: "Main Waiting Room A",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        location_id: "20000000-0000-0000-0000-000000000002",
        location_type: "EXAMINATION_ROOM",
        building: "Main Building",
        floor: "1st Floor",
        room: "Exam Room 102",
        display_name: "Outpatient Exam Room 102",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ];

    for (const loc of locations) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT location_id FROM patient_locations WHERE location_id = '${loc.location_id}'`
      );
      if (existing.length === 0) {
        await queryInterface.bulkInsert("patient_locations", [loc]);
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("execution_queues", null, {});
    await queryInterface.bulkDelete("patient_locations", null, {});
  },
};
