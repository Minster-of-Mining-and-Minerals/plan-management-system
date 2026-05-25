"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AuditLog extends Model {
    static associate(models) {
      AuditLog.belongsTo(models.User, {
        foreignKey: "actor_user_id",
        as: "actor",
      });
    }
  }

  AuditLog.init(
    {
      audit_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      actor_user_id: { type: DataTypes.UUID, allowNull: true },
      action: { type: DataTypes.STRING(64), allowNull: false },
      resource_type: { type: DataTypes.STRING(64), allowNull: false },
      resource_id: { type: DataTypes.UUID, allowNull: true },
      details: { type: DataTypes.JSONB, allowNull: true },
      ip_address: { type: DataTypes.STRING(64), allowNull: true },
    },
    {
      sequelize,
      modelName: "AuditLog",
      tableName: "audit_logs",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      underscored: true,
    }
  );

  return AuditLog;
};
