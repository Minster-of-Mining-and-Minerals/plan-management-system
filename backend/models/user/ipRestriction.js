"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class IpRestriction extends Model {
    static associate(models) {
      IpRestriction.belongsTo(models.User, {
        foreignKey: "restricted_by",
        as: "restrictor",
      });

      IpRestriction.belongsTo(models.User, {
        foreignKey: "unrestricted_by",
        as: "unrestrictor",
      });
    }
  }

  IpRestriction.init(
    {
      restriction_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      ip_address: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      is_cidr: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
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
      modelName: "IpRestriction",
      tableName: "ip_restrictions",
      underscored: true,
      timestamps: true,
    }
  );

  return IpRestriction;
};

