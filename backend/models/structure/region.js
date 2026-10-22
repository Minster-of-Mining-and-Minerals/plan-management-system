"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Region extends Model {
    static associate(models) {
      // 🔗 A region has many regional internal departments / structures
      Region.hasMany(models.RegionalStructure, {
        foreignKey: "region_id",
        as: "structures",
        onDelete: "CASCADE",
      });

      // 👥 A region has many regional user accounts
      Region.hasMany(models.User, {
        foreignKey: "region_id",
        as: "users",
      });

      // 🎨 A region has one regional branding configuration
      Region.hasOne(models.RegionalBrandingSetting, {
        foreignKey: "region_id",
        as: "branding",
        onDelete: "CASCADE",
      });

      // 🛡️ A region has many regional roles
      Region.hasMany(models.Role, {
        foreignKey: "region_id",
        as: "roles",
        onDelete: "CASCADE",
      });

      // 🔑 A region has many regional permission groups
      Region.hasMany(models.PermissionGroup, {
        foreignKey: "region_id",
        as: "permissionGroups",
        onDelete: "CASCADE",
      });
    }
  }

  Region.init(
    {
      region_id: {
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
      modelName: "Region",
      tableName: "regions",
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

  return Region;
};
