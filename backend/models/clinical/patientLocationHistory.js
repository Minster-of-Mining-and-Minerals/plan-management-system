"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PatientLocationHistory extends Model {
    static associate(models) {
      PatientLocationHistory.belongsTo(models.StaffAppointment, {
        foreignKey: "appointment_id",
        as: "appointment",
      });
      PatientLocationHistory.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      PatientLocationHistory.belongsTo(models.PatientLocation, {
        foreignKey: "location_id",
        as: "location",
      });
      PatientLocationHistory.belongsTo(models.User, {
        foreignKey: "assigned_by_staff_id",
        as: "assignedByStaff",
      });
    }
  }

  PatientLocationHistory.init(
    {
      history_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      appointment_id: { type: DataTypes.UUID, allowNull: false },
      patient_id: { type: DataTypes.UUID, allowNull: false },
      location_id: { type: DataTypes.UUID, allowNull: true },
      assigned_by_staff_id: { type: DataTypes.UUID, allowNull: true },
      location_name: { type: DataTypes.STRING(128), allowNull: false },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: "PatientLocationHistory",
      tableName: "patient_location_histories",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PatientLocationHistory;
};
