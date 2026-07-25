"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalTask extends Model {
    static associate(models) {
      ClinicalTask.belongsTo(models.User, { foreignKey: "patient_id", as: "patient" });
      ClinicalTask.belongsTo(models.User, { foreignKey: "assigned_to", as: "assignee" });
      ClinicalTask.belongsTo(models.User, { foreignKey: "assigned_by", as: "assigner" });
      ClinicalTask.belongsTo(models.ClinicalCarePlan, { foreignKey: "plan_id", as: "plan" });
    }
  }

  ClinicalTask.init({
    task_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    patient_id: { type: DataTypes.UUID, allowNull: false },
    plan_id: { type: DataTypes.UUID, allowNull: true },
    alert_id: { type: DataTypes.UUID, allowNull: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    assigned_to: { type: DataTypes.UUID, allowNull: false },
    assigned_by: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "OPEN" },
    priority: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "MEDIUM" },
    due_date: { type: DataTypes.DATE, allowNull: true },
    completed_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    sequelize, modelName: "ClinicalTask", tableName: "clinical_tasks",
    timestamps: true, createdAt: "created_at", updatedAt: "updated_at", underscored: true,
  });

  return ClinicalTask;
};
