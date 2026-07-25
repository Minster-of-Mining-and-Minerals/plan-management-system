"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class RadiologyProcedureCatalog extends Model {
    static associate(models) {
      RadiologyProcedureCatalog.belongsTo(models.BillingService, {
        foreignKey: "billing_service_id",
        as: "billingService",
      });
      RadiologyProcedureCatalog.hasMany(models.RadiologyStudy, {
        foreignKey: "procedure_catalog_id",
        as: "studies",
      });
    }
  }

  RadiologyProcedureCatalog.init(
    {
      procedure_catalog_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      modality: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "XRAY",
      },
      body_region: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "CHEST",
      },
      contrast_required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      estimated_duration_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30,
      },
      billing_service_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "RadiologyProcedureCatalog",
      tableName: "radiology_procedure_catalogs",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RadiologyProcedureCatalog;
};
