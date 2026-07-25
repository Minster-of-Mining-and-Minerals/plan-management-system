"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalAmendment extends Model {
    static associate(models) {
      ClinicalAmendment.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      ClinicalAmendment.belongsTo(models.User, {
        foreignKey: "requested_by",
        as: "requester",
      });
      ClinicalAmendment.belongsTo(models.User, {
        foreignKey: "reviewed_by",
        as: "reviewer",
      });
    }
  }

  ClinicalAmendment.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      entity_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      entity_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      patient_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      requested_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      reviewed_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "REQUESTED", // REQUESTED, UNDER_REVIEW, APPROVED, REJECTED
      },
      original_content_json: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      proposed_content_json: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      clinical_reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      review_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ClinicalAmendment",
      tableName: "clinical_amendments",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalAmendment;
};
