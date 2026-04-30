// models/role.js
"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Role extends Model {
    static associate(models) {
      // Role has many RolePermissions
      Role.hasMany(models.RolePermission, {
        foreignKey: "role_id",
        as: "rolePermissions",
      });

      Role.belongsToMany(models.User, {
        through: models.UserRoles,
        foreignKey: "role_id",
        otherKey: "user_id",
        as: "users",
      });
    }
  }

  Role.init(
    {
      role_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Role",
      tableName: "roles",
      timestamps: false,
      underscored: true,
      paranoid: true,
      deletedAt: "deleted_at",
    }
  );

  return Role;
};
