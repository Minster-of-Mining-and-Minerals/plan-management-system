"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AppointmentBillingAccount extends Model {
    static associate(models) {
      AppointmentBillingAccount.belongsTo(models.StaffAppointment, {
        foreignKey: "appointment_id",
        as: "appointment",
      });
      AppointmentBillingAccount.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      AppointmentBillingAccount.hasMany(models.AppointmentBillingEntry, {
        foreignKey: "account_id",
        as: "entries",
      });
    }
  }

  AppointmentBillingAccount.init(
    {
      account_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      appointment_id: { type: DataTypes.UUID, allowNull: false, unique: true },
      patient_id: { type: DataTypes.UUID, allowNull: false },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "draft",
      },
      subtotal: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      discount_total: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      tax_total: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      grand_total: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: DataTypes.STRING(8),
        allowNull: false,
        defaultValue: "ETB",
      },
    },
    {
      sequelize,
      modelName: "AppointmentBillingAccount",
      tableName: "appointment_billing_accounts",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return AppointmentBillingAccount;
};
