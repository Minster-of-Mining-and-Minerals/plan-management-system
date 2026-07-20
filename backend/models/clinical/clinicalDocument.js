"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalDocument extends Model {
    static associate(models) {
      ClinicalDocument.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      ClinicalDocument.belongsTo(models.StaffAppointment, {
        foreignKey: "appointment_id",
        as: "appointment",
      });
      ClinicalDocument.belongsTo(models.DiagnosisFormConfig, {
        foreignKey: "form_config_id",
        as: "formConfig",
      });
      ClinicalDocument.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
      ClinicalDocument.belongsTo(models.User, {
        foreignKey: "updated_by",
        as: "updater",
      });
      ClinicalDocument.belongsTo(models.User, {
        foreignKey: "reviewer_id",
        as: "reviewer",
      });
      ClinicalDocument.belongsTo(models.User, {
        foreignKey: "approver_id",
        as: "approver",
      });
      ClinicalDocument.belongsTo(models.ClinicalDocument, {
        foreignKey: "parent_document_id",
        as: "parentDocument",
      });
    }
  }

  ClinicalDocument.init(
    {
      document_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      patient_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      appointment_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      document_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      form_config_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      form_data: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      parent_document_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "draft",
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      updated_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      reviewer_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      approver_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      attachment_ids: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      signatures: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
    },
    {
      sequelize,
      modelName: "ClinicalDocument",
      tableName: "clinical_documents",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalDocument;
};
