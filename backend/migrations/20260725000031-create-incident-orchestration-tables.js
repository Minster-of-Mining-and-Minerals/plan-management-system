"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. clinical_incidents
    await queryInterface.createTable("clinical_incidents", {
      incident_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      incident_type: {
        type: Sequelize.STRING(64),
        allowNull: false, // SLA_BREACH, QUEUE_OVERLOAD, EQUIPMENT_UNAVAILABLE, ROOM_UNAVAILABLE, PROVIDER_UNAVAILABLE, RADIOLOGY_BACKLOG, LAB_BACKLOG, EMERGENCY_OVERLOAD, SAFETY_INCIDENT
      },
      severity: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: "MEDIUM", // LOW, MEDIUM, HIGH, CRITICAL
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "OPEN", // OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, CLOSED
      },
      department_id: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "HOSPITAL",
      },
      assigned_to_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      assigned_owner_role: {
        type: Sequelize.STRING(64),
        allowNull: true, // DEPARTMENT_HEAD, OPERATIONS_MANAGER, CHIEF_MEDICAL_OFFICER, PHARMACY_SUPERVISOR, LAB_SUPERVISOR, RAD_SUPERVISOR, NURSING_SUPERVISOR
      },
      source_entity_type: {
        type: Sequelize.STRING(64),
        allowNull: true, // CLINICAL_ORDER, QUEUE, ROOM, EQUIPMENT, APPOINTMENT
      },
      source_entity_id: {
        type: Sequelize.STRING(128),
        allowNull: true,
      },
      root_cause: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      resolution_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      acknowledged_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      resolved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      closed_at: {
        type: Sequelize.DATE,
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

    // 2. clinical_incident_rules
    await queryInterface.createTable("clinical_incident_rules", {
      rule_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      incident_type: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      severity: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: "HIGH",
      },
      trigger_condition: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      threshold_value: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      target_department: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "HOSPITAL",
      },
      default_owner_role: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "OPERATIONS_MANAGER",
      },
      is_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    // 3. clinical_playbooks
    await queryInterface.createTable("clinical_playbooks", {
      playbook_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      incident_type: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      steps: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    // 4. clinical_operational_messages
    await queryInterface.createTable("clinical_operational_messages", {
      message_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      incident_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      sender_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      recipient_role: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "OPERATIONS_MANAGER",
      },
      message_type: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "UPDATE", // UPDATE, ASSIGNMENT, ESCALATION, RESOLUTION
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      channel: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "HUB", // HUB, NOTIFICATION, TIMELINE
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

  down: async (queryInterface) => {
    await queryInterface.dropTable("clinical_operational_messages");
    await queryInterface.dropTable("clinical_playbooks");
    await queryInterface.dropTable("clinical_incident_rules");
    await queryInterface.dropTable("clinical_incidents");
  },
};
