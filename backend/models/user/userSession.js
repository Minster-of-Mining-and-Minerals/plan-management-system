"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class UserSession extends Model {
    static associate(models) {
      UserSession.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });

      UserSession.belongsTo(models.User, {
        foreignKey: "terminated_by",
        as: "terminator",
      });

      UserSession.belongsTo(models.Region, {
        foreignKey: "region_id",
        as: "region",
      });

      UserSession.belongsTo(models.Company, {
        foreignKey: "company_id",
        as: "company",
      });

      UserSession.belongsTo(models.PurchasingCenter, {
        foreignKey: "purchasing_center_id",
        as: "purchasingCenter",
      });

      UserSession.belongsTo(models.GovernmentStructure, {
        foreignKey: "government_structure_id",
        as: "governmentStructure",
      });
    }
  }

  UserSession.init(
    {
      session_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      session_token_hash: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      refresh_token_hash: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      device_fingerprint_hash: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      device_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      device_type: {
        type: DataTypes.STRING(50),
        defaultValue: "desktop",
      },
      operating_system: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      browser: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      browser_version: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      location: {
        type: DataTypes.STRING(150),
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
      organization_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
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
      government_structure_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(30),
        defaultValue: "active",
        allowNull: false,
      },
      last_activity_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      terminated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      terminated_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      termination_reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "UserSession",
      tableName: "user_sessions",
      underscored: true,
      timestamps: true,
    }
  );

  return UserSession;
};

