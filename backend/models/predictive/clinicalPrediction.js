"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalPrediction extends Model {
    static associate(models) {}
  }

  ClinicalPrediction.init(
    {
      prediction_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      prediction_type: { type: DataTypes.STRING(64), allowNull: false },
      domain: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "OPERATIONS" },
      department: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "HOSPITAL" },
      risk_level: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "MEDIUM" },
      probability: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.0 },
      expected_time: { type: DataTypes.STRING(64), allowNull: true },
      reason: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      confidence: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 85.0 },
      actual_outcome: { type: DataTypes.STRING(64), allowNull: true },
      accuracy: { type: DataTypes.FLOAT, allowNull: true },
    },
    {
      sequelize,
      modelName: "ClinicalPrediction",
      tableName: "clinical_predictions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalPrediction;
};
