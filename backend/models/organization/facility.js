"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Facility extends Model {
    static associate(models) {
      if (models.OrganizationTenant) {
        Facility.belongsTo(models.OrganizationTenant, {
          foreignKey: "tenant_id",
          as: "tenant",
          constraints: false,
        });
      }
      if (models.Department) {
        Facility.hasMany(models.Department, {
          foreignKey: "facility_id",
          as: "departments",
          constraints: false,
        });
      }
      if (models.Unit) {
        Facility.hasMany(models.Unit, {
          foreignKey: "facility_id",
          as: "units",
          constraints: false,
        });
      }
      if (models.UserFacilityAssignment) {
        Facility.hasMany(models.UserFacilityAssignment, {
          foreignKey: "facility_id",
          as: "userAssignments",
          constraints: false,
        });
      }
    }
  }

  Facility.init(
    {
      facility_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tenant_id: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "DEFAULT_HOSPITAL",
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "HOSPITAL",
      },
      address: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
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
      modelName: "Facility",
      tableName: "facilities",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
      underscored: true,
    }
  );

  return Facility;
};
