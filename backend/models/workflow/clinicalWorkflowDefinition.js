"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalWorkflowDefinition extends Model {
    static associate(models) {}
  }

  ClinicalWorkflowDefinition.init(
    {
      workflow_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING(128), allowNull: false },
      code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      department_id: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "GENERAL" },
      description: { type: DataTypes.TEXT, allowNull: true },
      steps: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: "ClinicalWorkflowDefinition",
      tableName: "clinical_workflow_definitions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalWorkflowDefinition;
};
