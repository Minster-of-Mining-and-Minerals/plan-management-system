"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MedicalCertificateTemplate extends Model {
    static associate(models) {
      MedicalCertificateTemplate.hasMany(models.MedicalCertificate, {
        foreignKey: "template_id",
        as: "certificates",
      });
    }
  }

  MedicalCertificateTemplate.init(
    {
      template_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING(255), allowNull: false },
      code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      header_html: { type: DataTypes.TEXT, allowNull: false },
      footer_html: { type: DataTypes.TEXT, allowNull: false },
      html_content: { type: DataTypes.TEXT, allowNull: false },
      stamp_image_file: { type: DataTypes.STRING(512), allowNull: true },
      has_template_stamp: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
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
      modelName: "MedicalCertificateTemplate",
      tableName: "medical_certificate_templates",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return MedicalCertificateTemplate;
};
