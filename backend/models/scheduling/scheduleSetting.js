"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ScheduleSetting extends Model {
    static associate(models) {
      ScheduleSetting.belongsTo(models.User, {
        foreignKey: "updated_by",
        as: "updater",
      });
    }
  }

  ScheduleSetting.init(
    {
      schedule_setting_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      slot_interval_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
      },
      horizon_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 365,
      },
      days_config: { type: DataTypes.JSONB, allowNull: false },
      updated_by: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "ScheduleSetting",
      tableName: "schedule_settings",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ScheduleSetting;
};
