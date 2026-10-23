"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PurchasingCenter extends Model {
    static associate(models) {
      // 👥 A purchasing center has many user accounts (Direct membership - NO departments)
      PurchasingCenter.hasMany(models.User, {
        foreignKey: "purchasing_center_id",
        as: "users",
      });

      // 🎨 A purchasing center has one branding configuration
      PurchasingCenter.hasOne(models.PurchasingCenterBrandingSetting, {
        foreignKey: "purchasing_center_id",
        as: "branding",
        onDelete: "CASCADE",
      });

      // 🛡️ A purchasing center has many purchasing-center-scoped roles
      PurchasingCenter.hasMany(models.Role, {
        foreignKey: "purchasing_center_id",
        as: "roles",
        onDelete: "CASCADE",
      });

      // 🔑 A purchasing center has many purchasing-center-scoped permission groups
      PurchasingCenter.hasMany(models.PermissionGroup, {
        foreignKey: "purchasing_center_id",
        as: "permissionGroups",
        onDelete: "CASCADE",
      });
    }
  }

  PurchasingCenter.init(
    {
      purchasing_center_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      logo_path: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "PurchasingCenter",
      tableName: "purchasing_centers",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
      indexes: [
        {
          unique: true,
          fields: ["code"],
        },
        {
          unique: true,
          fields: ["name"],
        },
        {
          fields: ["is_active"],
        },
      ],
    }
  );

  return PurchasingCenter;
};
