"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Department extends Model {
    static associate(models) {
      Department.belongsTo(models.User, {
        foreignKey: "dept_head",
        as: "head",
      });
      Department.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
      Department.belongsTo(models.User, {
        foreignKey: "updated_by",
        as: "updater",
      });
      Department.hasMany(models.InternalUserProfile, {
        foreignKey: "department_id",
        as: "staffProfiles",
      });
      if (models.Facility) {
        Department.belongsTo(models.Facility, {
          foreignKey: "facility_id",
          as: "facility",
          constraints: false,
        });
      }
      if (models.OrganizationTenant) {
        Department.belongsTo(models.OrganizationTenant, {
          foreignKey: "tenant_id",
          as: "tenant",
          constraints: false,
        });
      }
      if (models.Unit) {
        Department.hasMany(models.Unit, {
          foreignKey: "department_id",
          as: "units",
          constraints: false,
        });
      }
    }
  }

  Department.init(
    {
      department_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
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
        unique: true,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      slug: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
      },
      dept_head: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
      created_by: { type: DataTypes.UUID, allowNull: true },
      updated_by: { type: DataTypes.UUID, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
      deleted_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "Department",
      tableName: "departments",
      timestamps: false,
      underscored: true,
      paranoid: true,
      deletedAt: "deleted_at",
    }
  );

  return Department;
};
