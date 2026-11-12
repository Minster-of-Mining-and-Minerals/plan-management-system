"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class NationalReportingCustomCategory extends Model {
    static associate(models) {
      NationalReportingCustomCategory.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
    }
  }

  NationalReportingCustomCategory.init(
    {
      category_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      label: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      icon: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "📊",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      mandate_level: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "mandatory_default",
      },
      frequency_default: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "monthly",
      },
      typical_units: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "NationalReportingCustomCategory",
      tableName: "national_reporting_custom_categories",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return NationalReportingCustomCategory;
};

