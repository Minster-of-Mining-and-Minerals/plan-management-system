"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BrandingAuditLog extends Model {
    static associate(models) {
      BrandingAuditLog.belongsTo(models.BrandingSetting, {
        foreignKey: "branding_setting_id",
        as: "brandingSetting",
      });
      BrandingAuditLog.belongsTo(models.User, {
        foreignKey: "changed_by",
        as: "changedByUser",
      });
    }
  }

  BrandingAuditLog.init(
    {
      branding_audit_log_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      branding_setting_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      changed_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      previous_values: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      new_values: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "BrandingAuditLog",
      tableName: "branding_audit_logs",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return BrandingAuditLog;
};
