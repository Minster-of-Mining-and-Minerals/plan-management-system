"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalCarePlan extends Model {
    static associate(models) {
      ClinicalCarePlan.belongsTo(models.User, { foreignKey: "patient_id", as: "patient" });
      ClinicalCarePlan.belongsTo(models.User, { foreignKey: "created_by", as: "creator" });
      ClinicalCarePlan.hasMany(models.ClinicalGoal, { foreignKey: "plan_id", as: "goals" });
      ClinicalCarePlan.hasMany(models.ClinicalIntervention, { foreignKey: "plan_id", as: "interventions" });
      ClinicalCarePlan.hasMany(models.CareTeamMember, { foreignKey: "plan_id", as: "careTeam" });
      ClinicalCarePlan.hasMany(models.ClinicalTask, { foreignKey: "plan_id", as: "tasks" });
      ClinicalCarePlan.hasMany(models.PatientOutcome, { foreignKey: "plan_id", as: "outcomes" });
    }
  }

  ClinicalCarePlan.init({
    plan_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    patient_id: { type: DataTypes.UUID, allowNull: false },
    problem_id: { type: DataTypes.UUID, allowNull: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "DRAFT" },
    priority: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "MEDIUM" },
    start_date: { type: DataTypes.DATEONLY, allowNull: true },
    target_end_date: { type: DataTypes.DATEONLY, allowNull: true },
    actual_end_date: { type: DataTypes.DATEONLY, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: false },
  }, {
    sequelize, modelName: "ClinicalCarePlan", tableName: "clinical_care_plans",
    timestamps: true, createdAt: "created_at", updatedAt: "updated_at", underscored: true,
  });

  return ClinicalCarePlan;
};
