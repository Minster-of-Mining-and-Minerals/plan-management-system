"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PerformanceColorThreshold extends Model {
    static associate() {}
  }

  PerformanceColorThreshold.init(
    {
      performance_color_threshold_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      label: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      min_percentage: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 0, max: 100 },
      },
      max_percentage: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 0, max: 100 },
      },
      color_hex: {
        type: DataTypes.STRING(7),
        allowNull: false,
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "PerformanceColorThreshold",
      tableName: "performance_color_thresholds",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return PerformanceColorThreshold;
};
