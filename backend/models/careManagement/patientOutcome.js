"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PatientOutcome extends Model {
    static associate(models) {
      PatientOutcome.belongsTo(models.ClinicalCarePlan, { foreignKey: "plan_id", as: "plan" });
      PatientOutcome.belongsTo(models.ClinicalGoal, { foreignKey: "goal_id", as: "goal" });
      PatientOutcome.belongsTo(models.User, { foreignKey: "patient_id", as: "patient" });
      PatientOutcome.belongsTo(models.User, { foreignKey: "recorded_by", as: "recorder" });
    }
  }

  PatientOutcome.init({
    outcome_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    plan_id: { type: DataTypes.UUID, allowNull: false },
    goal_id: { type: DataTypes.UUID, allowNull: true },
    patient_id: { type: DataTypes.UUID, allowNull: false },
    outcome_name: { type: DataTypes.STRING(200), allowNull: false },
    baseline_value: { type: DataTypes.DECIMAL(12, 4), allowNull: true },
    target_value: { type: DataTypes.DECIMAL(12, 4), allowNull: true },
    current_value: { type: DataTypes.DECIMAL(12, 4), allowNull: true },
    unit: { type: DataTypes.STRING(50), allowNull: true },
    progress_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "STABLE" },
    measured_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    recorded_by: { type: DataTypes.UUID, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
  }, {
    sequelize, modelName: "PatientOutcome", tableName: "patient_outcomes",
    timestamps: true, createdAt: "created_at", updatedAt: "updated_at", underscored: true,
  });

  return PatientOutcome;
};
