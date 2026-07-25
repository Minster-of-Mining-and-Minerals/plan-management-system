"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalCapacitySnapshot extends Model {
    static associate(models) {}
  }

  ClinicalCapacitySnapshot.init(
    {
      snapshot_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      snapshot_type: { type: DataTypes.STRING(64), allowNull: false },
      entity_id: { type: DataTypes.STRING(128), allowNull: true },
      capacity_metrics: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      utilization_pct: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.0 },
      peak_utilization_pct: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.0 },
      timestamp: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: "ClinicalCapacitySnapshot",
      tableName: "clinical_capacity_snapshots",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalCapacitySnapshot;
};
