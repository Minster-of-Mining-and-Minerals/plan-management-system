"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class UserDeviceRestriction extends Model {
    static associate(models) {
      UserDeviceRestriction.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });

      UserDeviceRestriction.belongsTo(models.User, {
        foreignKey: "restricted_by",
        as: "restrictor",
      });

      UserDeviceRestriction.belongsTo(models.User, {
        foreignKey: "unrestricted_by",
        as: "unrestrictor",
      });
    }
  }

  UserDeviceRestriction.init(
    {
      restriction_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
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
        allowNull: true,
      },
      operating_system: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      browser: {
        type: DataTypes.STRING(100),
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
      restriction_reason: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      restricted_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      restricted_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      unrestricted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      unrestricted_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "UserDeviceRestriction",
      tableName: "user_device_restrictions",
      underscored: true,
      timestamps: true,
    }
  );

  return UserDeviceRestriction;
};

