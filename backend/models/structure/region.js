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

      // 📋 Regional Plan Management Associations
      Region.hasMany(models.RegionalPlanVersion, {
        foreignKey: "region_id",
        as: "planVersions",
        onDelete: "CASCADE",
      });

      Region.hasOne(models.RegionalPlanningConfiguration, {
        foreignKey: "region_id",
        as: "planningConfiguration",
        onDelete: "CASCADE",
      });

      Region.hasMany(models.RegionalPlanRule, {
        foreignKey: "region_id",
        as: "planRules",
        onDelete: "CASCADE",
      });

      Region.hasMany(models.NationalReportingAssignment, {
        foreignKey: "region_id",
        as: "nationalReportingAssignments",
        onDelete: "CASCADE",
      });

      Region.hasMany(models.RegionalRequirementMapping, {
        foreignKey: "region_id",
        as: "regionalRequirementMappings",
        onDelete: "CASCADE",
      });

      Region.hasMany(models.NationalPublishedRecord, {
        foreignKey: "region_id",
        as: "nationalPublishedRecords",
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
      national_reporting_method: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "form_based", // form_based (default), node_mapping (mutually exclusive)
      },
      form_reporting_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      form_reporting_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      form_reporting_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      form_reporting_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
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
