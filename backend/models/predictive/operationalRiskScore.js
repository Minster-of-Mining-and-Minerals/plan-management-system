"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class OperationalRiskScore extends Model {
    static associate(models) {}
  }

  OperationalRiskScore.init(
    {
      score_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      domain: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "HOSPITAL" },
      department: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "HOSPITAL" },
      risk_score: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.0 },
      risk_level: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "LOW" },
      factors: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      calculated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: "OperationalRiskScore",
      tableName: "operational_risk_scores",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return OperationalRiskScore;
};
