"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class UserRoles extends Model {
    static associate(models) {
      UserRoles.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
      UserRoles.belongsTo(models.Role, { foreignKey: "role_id", as: "role" });
    }
  }

  UserRoles.init(
    {
      user_role_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      user_id: { type: DataTypes.UUID },
      role_id: { type: DataTypes.UUID },
      assigned_by: DataTypes.UUID,
      assigned_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: "UserRoles",
      tableName: "user_roles",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return UserRoles;
};
