"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalCarePlan extends Model {
    static associate(models) {
      ClinicalCarePlan.belongsTo(models.StaffAppointment, {
        foreignKey: "appointment_id",
        as: "appointment",
      });
      ClinicalCarePlan.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      ClinicalCarePlan.belongsTo(models.User, {
        foreignKey: "created_by_staff_id",
        as: "createdByStaff",
      });
    }
  }

  ClinicalCarePlan.init(
    {
      care_plan_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      appointment_id: { type: DataTypes.UUID, allowNull: false },
      patient_id: { type: DataTypes.UUID, allowNull: false },
      created_by_staff_id: { type: DataTypes.UUID, allowNull: false },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "General Outpatient Care Plan",
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      goals: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      interventions: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      patient_instructions: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      monitoring_schedule: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      risk_factors: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
    },
    {
      sequelize,
      modelName: "ClinicalCarePlan",
      tableName: "clinical_care_plans",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalCarePlan;
};
