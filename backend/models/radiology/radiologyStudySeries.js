"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class RadiologyStudySeries extends Model {
    static associate(models) {
      RadiologyStudySeries.belongsTo(models.RadiologyStudy, {
        foreignKey: "study_id",
        as: "study",
      });
    }
  }

  RadiologyStudySeries.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      study_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      series_uid: {
        type: DataTypes.STRING(128),
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
      body_part: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      instance_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
    },
    {
      sequelize,
      modelName: "RadiologyStudySeries",
      tableName: "radiology_study_series",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RadiologyStudySeries;
};
