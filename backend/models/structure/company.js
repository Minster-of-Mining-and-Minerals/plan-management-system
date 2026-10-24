"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Company extends Model {
    static associate(models) {
      // 🔗 A company has many internal departments / structures
      Company.hasMany(models.CompanyStructure, {
        foreignKey: "company_id",
        as: "structures",
        onDelete: "CASCADE",
      });

      // 👥 A company has many user accounts
      Company.hasMany(models.User, {
        foreignKey: "company_id",
        as: "users",
      });

      // 🎨 A company has one branding configuration
      Company.hasOne(models.CompanyBrandingSetting, {
        foreignKey: "company_id",
        as: "branding",
        onDelete: "CASCADE",
      });

      // 🛡️ A company has many company-scoped roles
      Company.hasMany(models.Role, {
        foreignKey: "company_id",
        as: "roles",
        onDelete: "CASCADE",
      });

      // 🔑 A company has many company-scoped permission groups
      Company.hasMany(models.PermissionGroup, {
        foreignKey: "company_id",
        as: "permissionGroups",
        onDelete: "CASCADE",
      });

      // 🥇 A company can be a gold seller in gold purchase records
      Company.hasMany(models.GoldPurchase, {
        foreignKey: "company_id",
        as: "goldPurchases",
      });

      // 📋 Planning Lifecycle & Rules
      Company.hasOne(models.CompanyPlanningConfiguration, {
        foreignKey: "company_id",
        as: "planningConfiguration",
        onDelete: "CASCADE",
      });

      Company.hasMany(models.CompanyPlanRule, {
        foreignKey: "company_id",
        as: "planRules",
        onDelete: "CASCADE",
      });

      Company.hasMany(models.CompanyPlanVersion, {
        foreignKey: "company_id",
        as: "planVersions",
        onDelete: "CASCADE",
      });

      // ⛏️ Production Reporting
      Company.hasMany(models.CompanyProductionAssignment, {
        foreignKey: "company_id",
        as: "productionAssignments",
        onDelete: "CASCADE",
      });

      Company.hasMany(models.CompanyProductionReport, {
        foreignKey: "company_id",
        as: "productionReports",
        onDelete: "CASCADE",
      });
    }
  }

  Company.init(
    {
      company_id: {
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
      modelName: "Company",
      tableName: "companies",
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

  return Company;
};
