"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalProblem extends Model {
    static associate(models) {
      ClinicalProblem.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      ClinicalProblem.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
    }
  }

  ClinicalProblem.init(
    {
      problem_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      patient_id: { type: DataTypes.UUID, allowNull: false },
      problem_code: { type: DataTypes.STRING(50), allowNull: true },
      problem_name: { type: DataTypes.STRING(200), allowNull: false },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "ACTIVE", // ACTIVE, RESOLVED, CHRONIC, SUSPECTED
      },
      severity: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "MEDIUM", // LOW, MEDIUM, HIGH, CRITICAL
      },
      onset_date: { type: DataTypes.DATEONLY, allowNull: true },
      resolved_date: { type: DataTypes.DATEONLY, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      encounter_id: { type: DataTypes.UUID, allowNull: true },
      created_by: { type: DataTypes.UUID, allowNull: false },
    },
    {
      sequelize,
      modelName: "ClinicalProblem",
      tableName: "clinical_problems",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalProblem;
};
