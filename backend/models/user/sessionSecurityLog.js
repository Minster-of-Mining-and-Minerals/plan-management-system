"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class SessionSecurityLog extends Model {
    static associate(models) {
      SessionSecurityLog.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });

      SessionSecurityLog.belongsTo(models.User, {
        foreignKey: "actor_id",
        as: "actor",
      });
    }
  }

  SessionSecurityLog.init(
    {
      log_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      event_type: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      actor_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      session_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      device_fingerprint_hash: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      domain: {
        type: DataTypes.STRING(50),
        defaultValue: "federal",
      },
      organization_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      region_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      company_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      purchasing_center_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      details: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "SessionSecurityLog",
      tableName: "session_security_logs",
      underscored: true,
      timestamps: true,
      updatedAt: false,
    }
  );

  return SessionSecurityLog;
};

