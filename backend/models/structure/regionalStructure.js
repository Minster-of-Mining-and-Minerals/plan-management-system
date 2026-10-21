"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RegionalStructure extends Model {
    static associate(models) {
      // 🔗 Belongs to a Region root
      RegionalStructure.belongsTo(models.Region, {
        foreignKey: "region_id",
        as: "region",
      });

      // 🔁 Self-referential internal hierarchy (e.g. bureau -> directorate -> team)
      RegionalStructure.belongsTo(models.RegionalStructure, {
        foreignKey: "parent_id",
        as: "parent",
      });

      RegionalStructure.hasMany(models.RegionalStructure, {
        foreignKey: "parent_id",
        as: "children",
      });

      // 👥 Regional users assigned to this internal department
      RegionalStructure.hasMany(models.User, {
        foreignKey: "regional_structure_id",
        as: "users",
      });
    }
  }

  RegionalStructure.init(
    {
      regional_structure_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      region_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      parent_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      level: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "RegionalStructure",
      tableName: "regional_structures",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
      indexes: [
        {
          fields: ["region_id", "is_active"],
        },
        {
          fields: ["parent_id"],
        },
      ],
    }
  );

  return RegionalStructure;
};
