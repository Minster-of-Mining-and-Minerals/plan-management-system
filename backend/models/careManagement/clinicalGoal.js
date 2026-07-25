"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalGoal extends Model {
    static associate(models) {
      ClinicalGoal.belongsTo(models.ClinicalCarePlan, { foreignKey: "plan_id", as: "plan" });
      ClinicalGoal.belongsTo(models.User, { foreignKey: "patient_id", as: "patient" });
      ClinicalGoal.belongsTo(models.User, { foreignKey: "created_by", as: "creator" });
      ClinicalGoal.hasMany(models.ClinicalIntervention, { foreignKey: "goal_id", as: "interventions" });
      ClinicalGoal.hasMany(models.PatientOutcome, { foreignKey: "goal_id", as: "outcomes" });
    }
  }

  ClinicalGoal.init({
    goal_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    plan_id: { type: DataTypes.UUID, allowNull: false },
    patient_id: { type: DataTypes.UUID, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "PENDING" },
    target_value: { type: DataTypes.DECIMAL(12, 4), allowNull: true },
    baseline_value: { type: DataTypes.DECIMAL(12, 4), allowNull: true },
    current_value: { type: DataTypes.DECIMAL(12, 4), allowNull: true },
    unit: { type: DataTypes.STRING(50), allowNull: true },
    target_date: { type: DataTypes.DATEONLY, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: false },
  }, {
    sequelize, modelName: "ClinicalGoal", tableName: "clinical_goals",
    timestamps: true, createdAt: "created_at", updatedAt: "updated_at", underscored: true,
  });

  return ClinicalGoal;
};
