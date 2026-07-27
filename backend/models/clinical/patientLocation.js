"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PatientLocation extends Model {
    static associate(models) {
      PatientLocation.hasMany(models.PatientLocationHistory, {
        foreignKey: "location_id",
        as: "histories",
      });
      PatientLocation.hasMany(models.StaffAppointment, {
        foreignKey: "current_location_id",
        as: "appointmentsAtLocation",
      });
    }
  }

  PatientLocation.init(
    {
      location_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      location_type: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "WAITING_ROOM",
      },
      building: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      floor: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      room: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      bed: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      display_name: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "PatientLocation",
      tableName: "patient_locations",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PatientLocation;
};
