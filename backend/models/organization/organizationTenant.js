"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class OrganizationTenant extends Model {
    static associate(models) {
      if (models.Facility) {
        OrganizationTenant.hasMany(models.Facility, {
          foreignKey: "tenant_id",
          as: "facilities",
          constraints: false,
        });
      }
      if (models.UserFacilityAssignment) {
        OrganizationTenant.hasMany(models.UserFacilityAssignment, {
          foreignKey: "tenant_id",
          as: "userAssignments",
          constraints: false,
        });
      }
      if (models.Department) {
        OrganizationTenant.hasMany(models.Department, {
          foreignKey: "tenant_id",
          as: "departments",
          constraints: false,
        });
      }
    }
  }

  OrganizationTenant.init(
    {
      tenant_id: {
        type: DataTypes.STRING(64),
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
      },
      type: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "HOSPITAL",
      },
      branding_config_json: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      timezone: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "UTC",
      },
      currency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "USD",
      },
      country: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "US",
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "OrganizationTenant",
      tableName: "organization_tenants",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
      underscored: true,
    }
  );

  return OrganizationTenant;
};
