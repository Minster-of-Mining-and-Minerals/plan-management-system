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
      if (models.ClinicalGoal) {
        ClinicalCarePlan.hasMany(models.ClinicalGoal, { foreignKey: "plan_id", as: "goalItems" });
      }
      if (models.ClinicalIntervention) {
        ClinicalCarePlan.hasMany(models.ClinicalIntervention, { foreignKey: "plan_id", as: "interventionItems" });
      }
      if (models.CareTeamMember) {
        ClinicalCarePlan.hasMany(models.CareTeamMember, { foreignKey: "plan_id", as: "careTeam" });
      }
      if (models.ClinicalTask) {
        ClinicalCarePlan.hasMany(models.ClinicalTask, { foreignKey: "plan_id", as: "tasks" });
      }
      if (models.PatientOutcome) {
        ClinicalCarePlan.hasMany(models.PatientOutcome, { foreignKey: "plan_id", as: "outcomes" });
      }
    }
  }

  ClinicalCarePlan.init(
    {
      plan_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      care_plan_id: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.getDataValue("plan_id") || this.plan_id;
        },
        set(val) {
          this.setDataValue("plan_id", val);
        },
      },
      appointment_id: { type: DataTypes.UUID, allowNull: true },
      patient_id: { type: DataTypes.UUID, allowNull: false },
      created_by_staff_id: { type: DataTypes.UUID, allowNull: true },
      created_by: { type: DataTypes.UUID, allowNull: true },
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
      priority: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "MEDIUM",
      },
      start_date: { type: DataTypes.DATEONLY, allowNull: true },
      target_end_date: { type: DataTypes.DATEONLY, allowNull: true },
      actual_end_date: { type: DataTypes.DATEONLY, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
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
