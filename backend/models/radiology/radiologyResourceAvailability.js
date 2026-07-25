"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class RadiologyResourceAvailability extends Model {
    static associate(models) {
      RadiologyResourceAvailability.belongsTo(models.RadiologyResource, {
        foreignKey: "resource_id",
        as: "resource",
      });
      RadiologyResourceAvailability.belongsTo(models.RadiologyStudy, {
        foreignKey: "study_id",
        as: "study",
      });
    }
  }

  RadiologyResourceAvailability.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      resource_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      available_from: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      available_to: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      maintenance_block: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      study_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "RadiologyResourceAvailability",
      tableName: "radiology_resource_availability",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RadiologyResourceAvailability;
};
