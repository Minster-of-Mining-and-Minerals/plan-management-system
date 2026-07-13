"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ReceiptTemplate extends Model {
    static associate(models) {
      ReceiptTemplate.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
      ReceiptTemplate.belongsTo(models.User, {
        foreignKey: "updated_by",
        as: "updater",
      });
    }
  }

  ReceiptTemplate.init(
    {
      template_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING(150), allowNull: false },
      code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
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
      modelName: "ReceiptTemplate",
      tableName: "receipt_templates",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
      underscored: true,
    }
  );

  return ReceiptTemplate;
};
