"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MedicationSubstitutionRequest extends Model {
    static associate(models) {
      MedicationSubstitutionRequest.belongsTo(models.PharmacyPrescriptionItem, {
        foreignKey: "pharmacy_prescription_item_id",
        as: "item",
      });
      MedicationSubstitutionRequest.belongsTo(models.MedicationCatalog, {
        foreignKey: "requested_medication_id",
        as: "requestedMedication",
      });
      MedicationSubstitutionRequest.belongsTo(models.User, {
        foreignKey: "requested_by",
        as: "requester",
      });
      MedicationSubstitutionRequest.belongsTo(models.User, {
        foreignKey: "approved_by",
        as: "approver",
      });
    }
  }

  MedicationSubstitutionRequest.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      pharmacy_prescription_item_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      original_medication_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      requested_medication_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "REQUESTED", // REQUESTED, PHYSICIAN_REVIEW, APPROVED, REJECTED
      },
      requested_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      approved_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "MedicationSubstitutionRequest",
      tableName: "medication_substitution_requests",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return MedicationSubstitutionRequest;
};
