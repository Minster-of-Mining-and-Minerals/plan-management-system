"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PrescriptionPharmacyForward extends Model {
    static associate(models) {
      PrescriptionPharmacyForward.belongsTo(models.Prescription, {
        foreignKey: "prescription_id",
        as: "prescription",
      });
      PrescriptionPharmacyForward.belongsTo(models.PatientSchedule, {
        foreignKey: "schedule_id",
        as: "schedule",
      });
      PrescriptionPharmacyForward.belongsTo(models.Pharmacy, {
        foreignKey: "pharmacy_id",
        as: "pharmacy",
      });
      PrescriptionPharmacyForward.belongsTo(models.PharmacyPrescription, {
        foreignKey: "pharmacy_prescription_id",
        as: "pharmacyPrescription",
      });
      PrescriptionPharmacyForward.belongsTo(models.User, {
        foreignKey: "sent_by",
        as: "sender",
      });
      PrescriptionPharmacyForward.hasMany(
        models.PrescriptionPharmacyForwardFile,
        { foreignKey: "forward_id", as: "files" }
      );
      PrescriptionPharmacyForward.hasMany(
        models.PrescriptionPharmacyForwardAudit,
        { foreignKey: "forward_id", as: "audits" }
      );
    }
  }

  PrescriptionPharmacyForward.init(
    {
      forward_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      prescription_id: { type: DataTypes.UUID, allowNull: false },
      patient_id: { type: DataTypes.UUID, allowNull: false },
      schedule_id: { type: DataTypes.UUID, allowNull: true },
      pharmacy_id: { type: DataTypes.UUID, allowNull: false },
      pharmacy_prescription_id: { type: DataTypes.UUID, allowNull: false },
      sent_by: { type: DataTypes.UUID, allowNull: false },
      sent_at: { type: DataTypes.DATE, allowNull: false },
      forward_status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "sent",
      },
    },
    {
      sequelize,
      modelName: "PrescriptionPharmacyForward",
      tableName: "prescription_pharmacy_forwards",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PrescriptionPharmacyForward;
};
