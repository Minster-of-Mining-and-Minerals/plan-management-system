"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class NationalReportingPeriodConfig extends Model {
    static associate(models) {
      NationalReportingPeriodConfig.belongsTo(models.User, {
        foreignKey: "updated_by",
        as: "updater",
      });
    }
  }

  NationalReportingPeriodConfig.init(
    {
      config_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      frequency: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      display_title: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      division_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      divisions: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      updated_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "NationalReportingPeriodConfig",
      tableName: "national_reporting_period_configs",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return NationalReportingPeriodConfig;
};

