"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Unit extends Model {
    static associate(models) {
      if (models.Department) {
        Unit.belongsTo(models.Department, {
          foreignKey: "department_id",
          as: "department",
          constraints: false,
        });
      }
      if (models.Facility) {
        Unit.belongsTo(models.Facility, {
          foreignKey: "facility_id",
          as: "facility",
          constraints: false,
        });
      }
      if (models.OrganizationTenant) {
        Unit.belongsTo(models.OrganizationTenant, {
          foreignKey: "tenant_id",
          as: "tenant",
          constraints: false,
        });
      }
    }
  }

  Unit.init(
    {
      unit_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      department_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      facility_id: {
        type: DataTypes.UUID,
        allowNull: true,
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
      modelName: "Unit",
      tableName: "units",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
      underscored: true,
    }
  );

  return Unit;
};
