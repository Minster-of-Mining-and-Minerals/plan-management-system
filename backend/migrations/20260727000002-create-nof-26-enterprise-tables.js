"use strict";

const {
  timestampColumns,
  safeAddIndex,
  safeAddColumn,
  dropTableIfExists,
  createTableIfNotExists,
} = require("./_helpers/migrationUtils");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    try {
      console.log("Step 1: execution_queues...");
      await createTableIfNotExists(queryInterface, "execution_queues", {
        queue_id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        queue_type: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "DEPARTMENT",
        },
        queue_name: {
          type: Sequelize.STRING(128),
          allowNull: false,
        },
        queue_code: {
          type: Sequelize.STRING(64),
          allowNull: false,
          unique: true,
        },
        department_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: "departments", key: "department_id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        priority: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 10,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        is_claimable: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        sla_minutes: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 60,
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {},
        },
        ...ts,
      });

      await safeAddIndex(queryInterface, "execution_queues", ["queue_code"]);
      await safeAddIndex(queryInterface, "execution_queues", ["queue_type"]);
    } catch (e) {
      console.error("Failed Step 1:", e);
      throw e;
    }

    try {
      console.log("Step 2: patient_locations...");
      await createTableIfNotExists(queryInterface, "patient_locations", {
        location_id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        location_type: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "WAITING_ROOM",
        },
        building: {
          type: Sequelize.STRING(64),
          allowNull: true,
        },
        floor: {
          type: Sequelize.STRING(32),
          allowNull: true,
        },
        room: {
          type: Sequelize.STRING(32),
          allowNull: true,
        },
        bed: {
          type: Sequelize.STRING(32),
          allowNull: true,
        },
        display_name: {
          type: Sequelize.STRING(128),
          allowNull: false,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        ...ts,
      });
    } catch (e) {
      console.error("Failed Step 2:", e);
      throw e;
    }

    try {
      console.log("Step 3: patient_location_histories...");
      await createTableIfNotExists(queryInterface, "patient_location_histories", {
        history_id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        appointment_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: "staff_appointments", key: "appointment_id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        patient_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: "users", key: "user_id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        location_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: "patient_locations", key: "location_id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        assigned_by_staff_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: "users", key: "user_id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        location_name: {
          type: Sequelize.STRING(128),
          allowNull: false,
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        ...ts,
      });

      await safeAddColumn(queryInterface, "patient_location_histories", "appointment_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "staff_appointments", key: "appointment_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      });

      await safeAddIndex(queryInterface, "patient_location_histories", ["appointment_id"]);
    } catch (e) {
      console.error("Failed Step 3:", e);
      throw e;
    }

    try {
      console.log("Step 4: clinical_care_plans...");
      await createTableIfNotExists(queryInterface, "clinical_care_plans", {
        care_plan_id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        appointment_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: "staff_appointments", key: "appointment_id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        patient_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: "users", key: "user_id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        created_by_staff_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: "users", key: "user_id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        title: {
          type: Sequelize.STRING(255),
          allowNull: false,
          defaultValue: "General Outpatient Care Plan",
        },
        status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "ACTIVE",
        },
        goals: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [],
        },
        interventions: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [],
        },
        patient_instructions: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        monitoring_schedule: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [],
        },
        risk_factors: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [],
        },
        ...ts,
      });

      await safeAddColumn(queryInterface, "clinical_care_plans", "appointment_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "staff_appointments", key: "appointment_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      });

      await safeAddColumn(queryInterface, "clinical_care_plans", "patient_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      });

      await safeAddIndex(queryInterface, "clinical_care_plans", ["appointment_id"]);
      await safeAddIndex(queryInterface, "clinical_care_plans", ["patient_id"]);
    } catch (e) {
      console.error("Failed Step 4:", e);
      throw e;
    }

    try {
      console.log("Step 5: columns workflow_tasks...");
      const workflowDesc = await queryInterface.describeTable("workflow_tasks");
      if (!workflowDesc.execution_queue_id) {
        await queryInterface.addColumn("workflow_tasks", "execution_queue_id", {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: "execution_queues", key: "queue_id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        });
      }
      if (!workflowDesc.claimed_by_staff_id) {
        await queryInterface.addColumn("workflow_tasks", "claimed_by_staff_id", {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: "users", key: "user_id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        });
      }
      if (!workflowDesc.claimed_at) {
        await queryInterface.addColumn("workflow_tasks", "claimed_at", {
          type: Sequelize.DATE,
          allowNull: true,
        });
      }
      if (!workflowDesc.sla_due_at) {
        await queryInterface.addColumn("workflow_tasks", "sla_due_at", {
          type: Sequelize.DATE,
          allowNull: true,
        });
      }
      if (!workflowDesc.assignment_type) {
        await queryInterface.addColumn("workflow_tasks", "assignment_type", {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "OPERATIONAL",
        });
      }
    } catch (e) {
      console.error("Failed Step 5:", e);
      throw e;
    }

    try {
      console.log("Step 6: columns clinical_orders...");
      const ordersDesc = await queryInterface.describeTable("clinical_orders");
      if (!ordersDesc.execution_queue_id) {
        await queryInterface.addColumn("clinical_orders", "execution_queue_id", {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: "execution_queues", key: "queue_id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        });
      }
      if (!ordersDesc.clinical_intent_json) {
        await queryInterface.addColumn("clinical_orders", "clinical_intent_json", {
          type: Sequelize.JSONB,
          allowNull: true,
        });
      }
    } catch (e) {
      console.error("Failed Step 6:", e);
      throw e;
    }

    try {
      console.log("Step 7: columns diagnosis_records...");
      const diagDesc = await queryInterface.describeTable("diagnosis_records");
      if (!diagDesc.clinical_intent_json) {
        await queryInterface.addColumn("diagnosis_records", "clinical_intent_json", {
          type: Sequelize.JSONB,
          allowNull: true,
        });
      }
    } catch (e) {
      console.error("Failed Step 7:", e);
      throw e;
    }

    try {
      console.log("Step 8: columns staff_appointments...");
      const apptDesc = await queryInterface.describeTable("staff_appointments");
      if (!apptDesc.current_location_id) {
        await queryInterface.addColumn("staff_appointments", "current_location_id", {
          type: Sequelize.UUID,
          allowNull: true,
        });
      }
      if (!apptDesc.care_plan_id) {
        await queryInterface.addColumn("staff_appointments", "care_plan_id", {
          type: Sequelize.UUID,
          allowNull: true,
        });
      }
    } catch (e) {
      console.error("Failed Step 8:", e);
      throw e;
    }
  },

  async down(queryInterface) {
    const apptDesc = await queryInterface.describeTable("staff_appointments");
    if (apptDesc.care_plan_id) {
      await queryInterface.removeColumn("staff_appointments", "care_plan_id");
    }
    if (apptDesc.current_location_id) {
      await queryInterface.removeColumn("staff_appointments", "current_location_id");
    }

    const diagDesc = await queryInterface.describeTable("diagnosis_records");
    if (diagDesc.clinical_intent_json) {
      await queryInterface.removeColumn("diagnosis_records", "clinical_intent_json");
    }

    const ordersDesc = await queryInterface.describeTable("clinical_orders");
    if (ordersDesc.clinical_intent_json) {
      await queryInterface.removeColumn("clinical_orders", "clinical_intent_json");
    }
    if (ordersDesc.execution_queue_id) {
      await queryInterface.removeColumn("clinical_orders", "execution_queue_id");
    }

    const workflowDesc = await queryInterface.describeTable("workflow_tasks");
    if (workflowDesc.assignment_type) {
      await queryInterface.removeColumn("workflow_tasks", "assignment_type");
    }
    if (workflowDesc.sla_due_at) {
      await queryInterface.removeColumn("workflow_tasks", "sla_due_at");
    }
    if (workflowDesc.claimed_at) {
      await queryInterface.removeColumn("workflow_tasks", "claimed_at");
    }
    if (workflowDesc.claimed_by_staff_id) {
      await queryInterface.removeColumn("workflow_tasks", "claimed_by_staff_id");
    }
    if (workflowDesc.execution_queue_id) {
      await queryInterface.removeColumn("workflow_tasks", "execution_queue_id");
    }

    await dropTableIfExists(queryInterface, "clinical_care_plans");
    await dropTableIfExists(queryInterface, "patient_location_histories");
    await dropTableIfExists(queryInterface, "patient_locations");
    await dropTableIfExists(queryInterface, "execution_queues");
  },
};
