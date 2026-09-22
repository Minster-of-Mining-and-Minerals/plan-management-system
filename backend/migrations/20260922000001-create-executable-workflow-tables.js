"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. workflow_step_definitions
    await queryInterface.createTable("workflow_step_definitions", {
      step_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      workflow_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "clinical_workflow_definitions",
          key: "workflow_id",
        },
        onDelete: "CASCADE",
      },
      step_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      type: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      form_config_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      department_id: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      role_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      is_required: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      transition_conditions: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // 2. workflow_instances
    await queryInterface.createTable("workflow_instances", {
      instance_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      workflow_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "clinical_workflow_definitions",
          key: "workflow_id",
        },
        onDelete: "CASCADE",
      },
      appointment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "staff_appointments",
          key: "appointment_id",
        },
        onDelete: "CASCADE",
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "PENDING",
      },
      current_step_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "workflow_step_definitions",
          key: "step_id",
        },
        onDelete: "SET NULL",
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      started_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      completed_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // 3. workflow_step_instances
    await queryInterface.createTable("workflow_step_instances", {
      step_instance_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      instance_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "workflow_instances",
          key: "instance_id",
        },
        onDelete: "CASCADE",
      },
      step_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "workflow_step_definitions",
          key: "step_id",
        },
        onDelete: "CASCADE",
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "PENDING",
      },
      assigned_staff_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      assigned_department_id: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completed_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("workflow_step_instances");
    await queryInterface.dropTable("workflow_instances");
    await queryInterface.dropTable("workflow_step_definitions");
  },
};
