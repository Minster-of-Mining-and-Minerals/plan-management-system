"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PredictionModelRegistry extends Model {
    static associate(models) {}
  }

  PredictionModelRegistry.init(
    {
      model_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      model_name: { type: DataTypes.STRING(128), allowNull: false },
      model_version: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "1.0.0" },
      prediction_type: { type: DataTypes.STRING(64), allowNull: false },
      accuracy_score: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 92.5 },
      training_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      active_status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: "PredictionModelRegistry",
      tableName: "prediction_models",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PredictionModelRegistry;
};
