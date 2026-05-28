"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PrescriptionTemplateItem extends Model {
    static associate(models) {
      PrescriptionTemplateItem.belongsTo(models.PrescriptionTemplate, {
        foreignKey: "template_id",
        as: "template",
      });
    }
  }

  PrescriptionTemplateItem.init(
    {
      item_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      template_id: { type: DataTypes.UUID, allowNull: false },
      item_name: { type: DataTypes.STRING(255), allowNull: false },
      strength: { type: DataTypes.STRING(120), allowNull: true },
      route: { type: DataTypes.STRING(120), allowNull: true },
      dosage: { type: DataTypes.STRING(120), allowNull: true },
      frequency: { type: DataTypes.STRING(120), allowNull: true },
      duration: { type: DataTypes.STRING(120), allowNull: true },
      instructions: { type: DataTypes.TEXT, allowNull: true },
      quantity: { type: DataTypes.STRING(64), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      modelName: "PrescriptionTemplateItem",
      tableName: "prescription_template_items",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PrescriptionTemplateItem;
};
