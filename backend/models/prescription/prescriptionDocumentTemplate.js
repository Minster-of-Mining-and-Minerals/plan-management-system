"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PrescriptionDocumentTemplate extends Model {
    static associate(models) {
      PrescriptionDocumentTemplate.belongsTo(models.PrescriptionCategory, {
        foreignKey: "category_id",
        as: "category",
      });
    }
  }

  PrescriptionDocumentTemplate.init(
    {
      document_template_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING(255), allowNull: false },
      code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      category_id: { type: DataTypes.UUID, allowNull: true },
      html_content: { type: DataTypes.TEXT, allowNull: false },
      is_default: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "active",
      },
      created_by: { type: DataTypes.UUID, allowNull: true },
      updated_by: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "PrescriptionDocumentTemplate",
      tableName: "prescription_document_templates",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PrescriptionDocumentTemplate;
};
