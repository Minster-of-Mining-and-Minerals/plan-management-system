"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalIntervention extends Model {
    static associate(models) {
      ClinicalIntervention.belongsTo(models.ClinicalCarePlan, { foreignKey: "plan_id", as: "plan" });
      ClinicalIntervention.belongsTo(models.ClinicalGoal, { foreignKey: "goal_id", as: "goal" });
      ClinicalIntervention.belongsTo(models.User, { foreignKey: "patient_id", as: "patient" });
      ClinicalIntervention.belongsTo(models.User, { foreignKey: "created_by", as: "creator" });
    }
  }

  ClinicalIntervention.init({
    intervention_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    goal_id: { type: DataTypes.UUID, allowNull: true },
    plan_id: { type: DataTypes.UUID, allowNull: false },
    patient_id: { type: DataTypes.UUID, allowNull: false },
    intervention_type: { type: DataTypes.STRING(50), allowNull: false, defaultValue: "OTHER" },
    description: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "PLANNED" },
    scheduled_date: { type: DataTypes.DATEONLY, allowNull: true },
    completed_date: { type: DataTypes.DATE, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: false },
  }, {
    sequelize, modelName: "ClinicalIntervention", tableName: "clinical_interventions",
    timestamps: true, createdAt: "created_at", updatedAt: "updated_at", underscored: true,
  });

  return ClinicalIntervention;
};
