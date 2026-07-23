"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create the EncounterFollowUpOutcome table
    await queryInterface.createTable("encounter_follow_up_outcomes", {
      follow_up_outcome_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      follow_up_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "encounter_follow_ups", key: "follow_up_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      encounter_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "staff_appointments", key: "appointment_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      outcome_status: {
        type: Sequelize.ENUM(
          "RESOLVED",
          "IMPROVED",
          "STABLE",
          "WORSENED",
          "REFERRED",
          "LOST_TO_FOLLOW_UP",
          "PATIENT_DECLINED",
          "OTHER"
        ),
        allowNull: false,
      },
      treatment_response: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      resolution_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      requires_additional_follow_up: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      recorded_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      recorded_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
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

    // Add indexes
    await queryInterface.addIndex("encounter_follow_up_outcomes", ["follow_up_id"], {
      name: "idx_outcomes_follow_up_id",
      unique: true,
    });
    await queryInterface.addIndex("encounter_follow_up_outcomes", ["encounter_id"], {
      name: "idx_outcomes_encounter_id",
    });
    await queryInterface.addIndex("encounter_follow_up_outcomes", ["outcome_status"], {
      name: "idx_outcomes_outcome_status",
    });

    // Add parent_follow_up_id to encounter_follow_ups for chain support
    await queryInterface.addColumn("encounter_follow_ups", "parent_follow_up_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "encounter_follow_ups", key: "follow_up_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addIndex("encounter_follow_ups", ["parent_follow_up_id"], {
      name: "idx_follow_ups_parent",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("encounter_follow_ups", "idx_follow_ups_parent");
    await queryInterface.removeColumn("encounter_follow_ups", "parent_follow_up_id");

    await queryInterface.removeIndex("encounter_follow_up_outcomes", "idx_outcomes_outcome_status");
    await queryInterface.removeIndex("encounter_follow_up_outcomes", "idx_outcomes_encounter_id");
    await queryInterface.removeIndex("encounter_follow_up_outcomes", "idx_outcomes_follow_up_id");

    await queryInterface.dropTable("encounter_follow_up_outcomes");
  },
};