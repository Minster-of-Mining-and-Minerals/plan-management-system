"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CompanyStructure extends Model {
    static associate(models) {
      // 🔗 Belongs to a Company root
      CompanyStructure.belongsTo(models.Company, {
        foreignKey: "company_id",
        as: "company",
      });

      // 🔁 Self-referential internal hierarchy (e.g. division -> department -> team)
      CompanyStructure.belongsTo(models.CompanyStructure, {
        foreignKey: "parent_id",
        as: "parent",
      });

      CompanyStructure.hasMany(models.CompanyStructure, {
        foreignKey: "parent_id",
        as: "children",
      });

      // 👥 Company users assigned to this internal department
      CompanyStructure.hasMany(models.User, {
        foreignKey: "company_structure_id",
        as: "users",
      });
    }
  }

  CompanyStructure.init(
    {
      company_structure_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_id: {
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
      modelName: "CompanyStructure",
      tableName: "company_structures",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
      indexes: [
        {
          fields: ["company_id", "is_active"],
        },
        {
          fields: ["parent_id"],
        },
      ],
    }
  );

  return CompanyStructure;
};
