"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class SystemSetting extends Model {}

  SystemSetting.init(
    {
      system_setting_id: {
        type: DataTypes.UUID,
        primaryKey: true,
      },
      expose_required_permissions: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "SystemSetting",
      tableName: "system_settings",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return SystemSetting;
};
