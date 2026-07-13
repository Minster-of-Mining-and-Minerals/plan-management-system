"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BillingCollectionRequest extends Model {
    static associate(models) {
      BillingCollectionRequest.belongsTo(models.AppointmentBillingAccount, {
        foreignKey: "account_id",
        as: "account",
      });
      BillingCollectionRequest.belongsTo(models.StaffAppointment, {
        foreignKey: "appointment_id",
        as: "appointment",
      });
      BillingCollectionRequest.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      BillingCollectionRequest.belongsTo(models.User, {
        foreignKey: "requested_by",
        as: "requester",
      });
    }
  }

  BillingCollectionRequest.init(
    {
      request_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      account_id: { type: DataTypes.UUID, allowNull: false },
      appointment_id: { type: DataTypes.UUID, allowNull: false },
      patient_id: { type: DataTypes.UUID, allowNull: false },
      requested_by: { type: DataTypes.UUID, allowNull: false },
      requested_at: { type: DataTypes.DATE, allowNull: false },
      amount_due_at_request: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "pending",
      },
      source: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "manual",
      },
      note: { type: DataTypes.TEXT, allowNull: true },
      collected_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "BillingCollectionRequest",
      tableName: "billing_collection_requests",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return BillingCollectionRequest;
};
