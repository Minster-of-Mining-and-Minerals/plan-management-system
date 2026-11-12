"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class NationalReportingCustomUnit extends Model {
    static associate(models) {
      NationalReportingCustomUnit.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
    }
  }

  NationalReportingCustomUnit.init(
    {
      unit_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      unit_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      label: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      base_unit: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      multiplier: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 1.0,
      },
      is_base: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "NationalReportingCustomUnit",
      tableName: "national_reporting_custom_units",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return NationalReportingCustomUnit;
};

