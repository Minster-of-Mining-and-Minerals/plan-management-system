"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class EncounterFollowUpOutcome extends Model {
    static associate(models) {
      EncounterFollowUpOutcome.belongsTo(models.EncounterFollowUp, {
        foreignKey: "follow_up_id",
        as: "followUp",
      });
      EncounterFollowUpOutcome.belongsTo(models.StaffAppointment, {
        foreignKey: "encounter_id",
        as: "encounter",
      });
      EncounterFollowUpOutcome.belongsTo(models.User, {
        foreignKey: "recorded_by",
        as: "recorder",
      });
    }
  }

  EncounterFollowUpOutcome.init(
    {
      follow_up_outcome_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      follow_up_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "The EncounterFollowUp this outcome belongs to",
      },
      encounter_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "The StaffAppointment (follow-up encounter) where outcome was assessed",
      },
      outcome_status: {
        type: DataTypes.ENUM(
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
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "How the patient responded to the treatment plan",
      },
      resolution_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Clinical notes describing the outcome assessment",
      },
      requires_additional_follow_up: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      recorded_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      recorded_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "EncounterFollowUpOutcome",
      tableName: "encounter_follow_up_outcomes",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return EncounterFollowUpOutcome;
};