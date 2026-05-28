"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PrescriptionTemplate extends Model {
    static associate(models) {
      PrescriptionTemplate.belongsTo(models.PrescriptionCategory, {
        foreignKey: "category_id",
        as: "category",
      });
      PrescriptionTemplate.hasMany(models.PrescriptionTemplateItem, {
        foreignKey: "template_id",
        as: "items",
      });
    }
  }

  PrescriptionTemplate.init(
    {
      template_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      category_id: { type: DataTypes.UUID, allowNull: false },
      name: { type: DataTypes.STRING(255), allowNull: false },
      code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      template_type: { type: DataTypes.STRING(64), allowNull: true },
      template_content: { type: DataTypes.TEXT, allowNull: true },
      has_template_signature: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      template_signature_file: { type: DataTypes.STRING(500), allowNull: true },
      allow_user_signature_override: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
      modelName: "PrescriptionTemplate",
      tableName: "prescription_templates",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PrescriptionTemplate;
};
