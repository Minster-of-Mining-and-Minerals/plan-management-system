"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalOrder extends Model {
    static associate(models) {
      ClinicalOrder.belongsTo(models.StaffAppointment, {
        foreignKey: "appointment_id",
        as: "appointment",
      });
      ClinicalOrder.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      ClinicalOrder.belongsTo(models.User, {
        foreignKey: "ordered_by",
        as: "orderedByUser",
      });
      ClinicalOrder.belongsTo(models.Department, {
        foreignKey: "assigned_department_id",
        as: "department",
      });
      ClinicalOrder.belongsTo(models.User, {
        foreignKey: "assigned_staff_id",
        as: "assignedStaff",
      });
      ClinicalOrder.hasOne(models.ClinicalOrderResult, {
        foreignKey: "order_id",
        as: "result",
      });
      ClinicalOrder.hasMany(models.ClinicalOrderStatusHistory, {
        foreignKey: "order_id",
        as: "statusHistory",
      });
      ClinicalOrder.hasMany(models.LaboratoryOrderItem, {
        foreignKey: "order_id",
        as: "labItems",
      });
      ClinicalOrder.hasMany(models.LaboratorySpecimen, {
        foreignKey: "order_id",
        as: "specimens",
      });
      ClinicalOrder.belongsTo(models.Prescription, {
        foreignKey: "prescription_id",
        as: "prescription",
      });
    }
  }

  ClinicalOrder.init(
    {
      order_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      appointment_id: { type: DataTypes.UUID, allowNull: false },
      patient_id: { type: DataTypes.UUID, allowNull: false },
      ordered_by: { type: DataTypes.UUID, allowNull: false },
      assigned_department_id: { type: DataTypes.UUID, allowNull: true },
      assigned_staff_id: { type: DataTypes.UUID, allowNull: true },
      prescription_id: { type: DataTypes.UUID, allowNull: true },
      order_type: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "LABORATORY",
      },
      priority: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: "ROUTINE",
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "SUBMITTED",
      },
      laboratory_status: {
        type: DataTypes.STRING(64),
        allowNull: true,
        defaultValue: "WAITING_FOR_COLLECTION",
      },
      pharmacy_status: {
        type: DataTypes.STRING(64),
        allowNull: true,
        defaultValue: "PENDING_FORWARD",
      },
      title: { type: DataTypes.STRING(255), allowNull: false },
      clinical_reason: { type: DataTypes.TEXT, allowNull: true },
      cancellation_reason: { type: DataTypes.TEXT, allowNull: true },
      order_items: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: "ClinicalOrder",
      tableName: "clinical_orders",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalOrder;
};
