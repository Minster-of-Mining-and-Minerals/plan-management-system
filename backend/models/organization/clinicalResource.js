"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalResource extends Model {
    static associate(models) {
      if (models.Facility) {
        ClinicalResource.belongsTo(models.Facility, {
          foreignKey: "facility_id",
          as: "facility",
          constraints: false,
        });
      }
      if (models.OrganizationTenant) {
        ClinicalResource.belongsTo(models.OrganizationTenant, {
          foreignKey: "tenant_id",
          as: "tenant",
          constraints: false,
        });
      }
      if (models.Department) {
        ClinicalResource.belongsTo(models.Department, {
          foreignKey: "department_id",
          as: "department",
          constraints: false,
        });
      }
    }
  }

  ClinicalResource.init(
    {
      resource_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tenant_id: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "DEFAULT_HOSPITAL",
      },
      facility_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      department_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      resource_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "AVAILABLE",
      },
      metadata_json: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "ClinicalResource",
      tableName: "clinical_resources",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalResource;
};
