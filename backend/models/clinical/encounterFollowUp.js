"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class EncounterFollowUp extends Model {
    static associate(models) {
      EncounterFollowUp.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      EncounterFollowUp.belongsTo(models.StaffAppointment, {
        foreignKey: "appointment_id",
        as: "appointment",
      });
      EncounterFollowUp.belongsTo(models.User, {
        foreignKey: "recommended_by",
        as: "recommender",
      });
      EncounterFollowUp.belongsTo(models.Department, {
        foreignKey: "assigned_department_id",
        as: "assignedDepartment",
      });
      EncounterFollowUp.belongsTo(models.User, {
        foreignKey: "assigned_user_id",
        as: "assignedUser",
      });
      EncounterFollowUp.hasMany(models.EncounterFollowUpAttempt, {
        foreignKey: "follow_up_id",
        as: "attempts",
      });
      EncounterFollowUp.belongsTo(models.StaffAppointment, {
        foreignKey: "completed_encounter_id",
        as: "completedEncounter",
      });
      EncounterFollowUp.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "createdByUser",
      });
      EncounterFollowUp.belongsTo(models.User, {
        foreignKey: "updated_by",
        as: "updatedByUser",
      });
      // Phase 2.4.4 - Follow-up Chain: self-referencing parent
      EncounterFollowUp.belongsTo(models.EncounterFollowUp, {
        foreignKey: "parent_follow_up_id",
        as: "parentFollowUp",
      });
      EncounterFollowUp.hasMany(models.EncounterFollowUp, {
        foreignKey: "parent_follow_up_id",
        as: "childFollowUps",
      });
      // Phase 2.4.4 - Follow-up Outcome
      EncounterFollowUp.hasOne(models.EncounterFollowUpOutcome, {
        foreignKey: "follow_up_id",
        as: "outcome",
      });
    }
  }

  EncounterFollowUp.init(
    {
      follow_up_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      patient_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      appointment_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "The current encounter appointment where follow-up is recommended",
      },
      recommended_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      assigned_department_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      assigned_user_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      clinical_instructions: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      priority: {
        type: DataTypes.ENUM("LOW", "NORMAL", "HIGH", "URGENT"),
        allowNull: false,
        defaultValue: "NORMAL",
      },
      recommended_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      target_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(
          "RECOMMENDED",
          "PENDING_SCHEDULING",
          "SCHEDULED",
          "COMPLETED",
          "CANCELLED",
          "EXPIRED",
          "MISSED"
        ),
        allowNull: false,
        defaultValue: "RECOMMENDED",
      },
      completion_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      completed_encounter_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "The encounter where the follow-up was completed",
      },
      cancel_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      updated_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "EncounterFollowUp",
      tableName: "encounter_follow_ups",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
      paranoid: true,
      deletedAt: "deleted_at",
    }
  );

  return EncounterFollowUp;
};