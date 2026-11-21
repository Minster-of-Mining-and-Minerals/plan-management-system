"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class LicenseType extends Model {
    static associate(models) {
      LicenseType.hasMany(models.CompanyLicense, {
        foreignKey: "license_type_id",
        as: "licenses",
      });
    }
  }

  LicenseType.init(
    {
      license_type_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
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
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "LicenseType",
      tableName: "license_types",
      underscored: true,
      timestamps: true,
      paranoid: true,
    }
  );

  return LicenseType;
};
