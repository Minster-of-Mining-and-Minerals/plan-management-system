// models/user.js
"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {

      User.belongsToMany(models.Role, {
        through: models.UserRoles,
        foreignKey: "user_id",
        otherKey: "role_id",
        as: "roles",
      });

      User.belongsToMany(models.PermissionGroup, {
        through: models.UserPermissionGroup,
        foreignKey: "user_id",
        otherKey: "permission_group_id",
        as: "permissionGroups",
      });

      User.belongsTo(models.GovernmentStructure, {
        foreignKey: "government_structure_id",
        as: "governmentStructure",
      });

      User.belongsTo(models.InternalStructure, {
        foreignKey: "internal_structure_id",
        as: "internalStructure",
      });
    }
  }

  User.init(
    {
      user_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      full_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      phone_number: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true,
      },
      profile_image: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      is_first_logged_in: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      password_changed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      government_structure_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      internal_structure_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      otp: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      otp_expiry: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      underscored: true,
      defaultScope: {
        attributes: { exclude: ["password", "otp", "otp_expiry"] },
      },
      scopes: {
        withCredentials: {
          attributes: { include: ["password", "otp", "otp_expiry"] },
        },
      },
    }
  );

  return User;
};
