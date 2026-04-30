"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RolePermission extends Model {
    static associate(models) {
      this.belongsTo(models.Role, {
        foreignKey: "role_id",
        as: "role",
      });
      this.belongsTo(models.Permission, {
        foreignKey: "permission_id",
        as: "permission",
      });
    }
  }

  RolePermission.init(
    {
      role_permission_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      role_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      permission_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "RolePermission",
      tableName: "role_permissions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RolePermission;
};
