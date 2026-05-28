"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PatientSchedule extends Model {
    static associate(models) {
      PatientSchedule.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      PatientSchedule.belongsTo(models.User, {
        foreignKey: "assigned_staff_id",
        as: "staff",
      });
      PatientSchedule.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });

      PatientSchedule.hasOne(models.StaffAppointment, {
        foreignKey: "schedule_id",
        as: "staffAppointment",
      });
    }
  }

  PatientSchedule.init(
    {
      schedule_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      patient_id: { type: DataTypes.UUID, allowNull: false },
      assigned_staff_id: { type: DataTypes.UUID, allowNull: false },
      schedule_date: { type: DataTypes.DATEONLY, allowNull: false },
      start_time: { type: DataTypes.STRING(5), allowNull: false },
      end_time: { type: DataTypes.STRING(5), allowNull: false },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "scheduled",
      },
      appointment_type: { type: DataTypes.STRING(128), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      created_by: { type: DataTypes.UUID, allowNull: true },
      updated_by: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "PatientSchedule",
      tableName: "patient_schedules",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PatientSchedule;
};
