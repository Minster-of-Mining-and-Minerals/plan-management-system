"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class SystemAuditLog extends Model {
    static associate(models) {
      SystemAuditLog.belongsTo(models.User, {
        foreignKey: "changed_by",
        as: "changedByUser",
      });
    }
  }

  SystemAuditLog.init(
    {
      system_audit_log_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      module: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      action: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      entity_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      entity_label: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      summary: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      previous_values: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      new_values: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      changed_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "SystemAuditLog",
      tableName: "system_audit_logs",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return SystemAuditLog;
};
