"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AppointmentBillingEntry extends Model {
    static associate(models) {
      AppointmentBillingEntry.belongsTo(models.AppointmentBillingAccount, {
        foreignKey: "account_id",
        as: "account",
      });
      AppointmentBillingEntry.belongsTo(models.StaffAppointment, {
        foreignKey: "appointment_id",
        as: "appointment",
      });
      AppointmentBillingEntry.belongsTo(models.BillingService, {
        foreignKey: "service_id",
        as: "service",
      });
      AppointmentBillingEntry.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
      AppointmentBillingEntry.belongsTo(models.User, {
        foreignKey: "updated_by",
        as: "updater",
      });
      AppointmentBillingEntry.belongsTo(models.User, {
        foreignKey: "deleted_by",
        as: "deleter",
      });
      AppointmentBillingEntry.belongsTo(models.User, {
        foreignKey: "override_approved_by",
        as: "overrideApprover",
      });
      AppointmentBillingEntry.belongsTo(models.User, {
        foreignKey: "discount_approved_by",
        as: "discountApprover",
      });
    }
  }

  AppointmentBillingEntry.init(
    {
      entry_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      account_id: { type: DataTypes.UUID, allowNull: false },
      appointment_id: { type: DataTypes.UUID, allowNull: false },
      service_id: { type: DataTypes.UUID, allowNull: true },
      service_name: { type: DataTypes.STRING(255), allowNull: false },
      service_code: { type: DataTypes.STRING(64), allowNull: true },
      category_name: { type: DataTypes.STRING(150), allowNull: true },
      department_id: { type: DataTypes.UUID, allowNull: true },
      department_name: { type: DataTypes.STRING(255), allowNull: true },
      quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1,
      },
      unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      original_unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      tax_percent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      line_subtotal: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      discount_type: { type: DataTypes.STRING(32), allowNull: true },
      discount_value: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      discount_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      discount_reason: { type: DataTypes.TEXT, allowNull: true },
      discount_approved_by: { type: DataTypes.UUID, allowNull: true },
      line_tax_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      line_total: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      currency: {
        type: DataTypes.STRING(8),
        allowNull: false,
        defaultValue: "ETB",
      },
      note: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "active",
      },
      has_price_override: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      override_reason: { type: DataTypes.TEXT, allowNull: true },
      override_approved_by: { type: DataTypes.UUID, allowNull: true },
      created_by: { type: DataTypes.UUID, allowNull: true },
      updated_by: { type: DataTypes.UUID, allowNull: true },
      deleted_by: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "AppointmentBillingEntry",
      tableName: "appointment_billing_entries",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      paranoid: true,
      deletedAt: "deleted_at",
      underscored: true,
    }
  );

  return AppointmentBillingEntry;
};
