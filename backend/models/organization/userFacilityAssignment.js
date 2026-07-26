"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class UserFacilityAssignment extends Model {
    static associate(models) {
      if (models.User) {
        UserFacilityAssignment.belongsTo(models.User, {
          foreignKey: "user_id",
          as: "user",
          constraints: false,
        });
      }
      if (models.Facility) {
        UserFacilityAssignment.belongsTo(models.Facility, {
          foreignKey: "facility_id",
          as: "facility",
          constraints: false,
        });
      }
      if (models.OrganizationTenant) {
        UserFacilityAssignment.belongsTo(models.OrganizationTenant, {
          foreignKey: "tenant_id",
          as: "tenant",
          constraints: false,
        });
      }
      if (models.Role) {
        UserFacilityAssignment.belongsTo(models.Role, {
          foreignKey: "role_id",
          as: "role",
          constraints: false,
        });
      }
    }
  }

  UserFacilityAssignment.init(
    {
      assignment_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      tenant_id: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "DEFAULT_HOSPITAL",
      },
      facility_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      role_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      role_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Staff",
      },
      is_default: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
    },
    {
      sequelize,
      modelName: "UserFacilityAssignment",
      tableName: "user_facility_assignments",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return UserFacilityAssignment;
};
