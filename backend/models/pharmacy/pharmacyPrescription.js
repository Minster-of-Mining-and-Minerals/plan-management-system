"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PharmacyPrescription extends Model {
    static associate(models) {
      PharmacyPrescription.belongsTo(models.Prescription, {
        foreignKey: "original_prescription_id",
        as: "originalPrescription",
      });
      PharmacyPrescription.belongsTo(models.Pharmacy, {
        foreignKey: "pharmacy_id",
        as: "pharmacy",
      });
      PharmacyPrescription.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      PharmacyPrescription.belongsTo(models.User, {
        foreignKey: "prescriber_id",
        as: "prescriber",
      });
      PharmacyPrescription.belongsTo(models.User, {
        foreignKey: "sent_by",
        as: "sender",
      });
      PharmacyPrescription.hasMany(models.PharmacyPrescriptionItem, {
        foreignKey: "pharmacy_prescription_id",
        as: "items",
      });
      PharmacyPrescription.hasMany(models.PharmacyPrescriptionVersion, {
        foreignKey: "pharmacy_prescription_id",
        as: "versions",
      });
      PharmacyPrescription.hasMany(models.PrescriptionFulfillment, {
        foreignKey: "pharmacy_prescription_id",
        as: "fulfillments",
      });
    }
  }

  PharmacyPrescription.init(
    {
      pharmacy_prescription_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      original_prescription_id: { type: DataTypes.UUID, allowNull: false },
      pharmacy_id: { type: DataTypes.UUID, allowNull: false },
      patient_id: { type: DataTypes.UUID, allowNull: false },
      prescriber_id: { type: DataTypes.UUID, allowNull: false },
      source_rendered_html: { type: DataTypes.TEXT, allowNull: true },
      source_notes: { type: DataTypes.TEXT, allowNull: true },
      source_header_title: { type: DataTypes.STRING(255), allowNull: true },
      patient_snapshot: { type: DataTypes.JSONB, allowNull: true },
      prescriber_snapshot: { type: DataTypes.JSONB, allowNull: true },
      pharmacy_status: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: "received",
      },
      pharmacy_notes: { type: DataTypes.TEXT, allowNull: true },
      sent_by: { type: DataTypes.UUID, allowNull: true },
      sent_at: { type: DataTypes.DATE, allowNull: true },
      received_at: { type: DataTypes.DATE, allowNull: true },
      completed_at: { type: DataTypes.DATE, allowNull: true },
      current_version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      created_by: { type: DataTypes.UUID, allowNull: true },
      updated_by: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "PharmacyPrescription",
      tableName: "pharmacy_prescriptions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PharmacyPrescription;
};
