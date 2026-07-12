"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CashierPayment extends Model {
    static associate(models) {
      CashierPayment.belongsTo(models.AppointmentBillingAccount, {
        foreignKey: "account_id",
        as: "account",
      });
      CashierPayment.belongsTo(models.StaffAppointment, {
        foreignKey: "appointment_id",
        as: "appointment",
      });
      CashierPayment.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      CashierPayment.belongsTo(models.CashierSession, {
        foreignKey: "session_id",
        as: "session",
      });
      CashierPayment.belongsTo(models.User, {
        foreignKey: "received_by",
        as: "receiver",
      });
      CashierPayment.hasMany(models.PaymentTender, {
        foreignKey: "payment_id",
        as: "tenders",
      });
    }
  }

  CashierPayment.init(
    {
      payment_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      account_id: { type: DataTypes.UUID, allowNull: false },
      appointment_id: { type: DataTypes.UUID, allowNull: false },
      patient_id: { type: DataTypes.UUID, allowNull: false },
      session_id: { type: DataTypes.UUID, allowNull: false },
      receipt_number: { type: DataTypes.STRING(32), allowNull: false, unique: true },
      amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      currency: {
        type: DataTypes.STRING(8),
        allowNull: false,
        defaultValue: "ETB",
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "completed",
      },
      reference_note: { type: DataTypes.TEXT, allowNull: true },
      client_reference: { type: DataTypes.UUID, allowNull: true, unique: true },
      received_by: { type: DataTypes.UUID, allowNull: false },
      voided_by: { type: DataTypes.UUID, allowNull: true },
      void_reason: { type: DataTypes.TEXT, allowNull: true },
      voided_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "CashierPayment",
      tableName: "cashier_payments",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return CashierPayment;
};
