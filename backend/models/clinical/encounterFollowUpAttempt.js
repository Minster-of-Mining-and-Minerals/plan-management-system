"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class EncounterFollowUpAttempt extends Model {
    static associate(models) {
      EncounterFollowUpAttempt.belongsTo(models.EncounterFollowUp, {
        foreignKey: "follow_up_id",
        as: "followUp",
      });
      EncounterFollowUpAttempt.belongsTo(models.PatientSchedule, {
        foreignKey: "schedule_id",
        as: "schedule",
      });
      EncounterFollowUpAttempt.belongsTo(models.User, {
        foreignKey: "scheduled_by",
        as: "scheduler",
      });
    }
  }

  EncounterFollowUpAttempt.init(
    {
      attempt_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      follow_up_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      schedule_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "The PatientSchedule record for this attempt",
      },
      status: {
        type: DataTypes.ENUM("SCHEDULED", "MISSED", "CANCELLED", "ATTENDED"),
        allowNull: false,
        defaultValue: "SCHEDULED",
      },
      scheduled_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      cancel_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      scheduled_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "EncounterFollowUpAttempt",
      tableName: "encounter_follow_up_attempts",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
      paranoid: true,
      deletedAt: "deleted_at",
    }
  );

  return EncounterFollowUpAttempt;
};