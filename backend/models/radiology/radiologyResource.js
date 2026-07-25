"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class RadiologyResource extends Model {
    static associate(models) {
      RadiologyResource.hasMany(models.RadiologyResourceAvailability, {
        foreignKey: "resource_id",
        as: "availabilities",
      });
    }
  }

  RadiologyResource.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      resource_type: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      location: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "RadiologyResource",
      tableName: "radiology_resources",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RadiologyResource;
};
