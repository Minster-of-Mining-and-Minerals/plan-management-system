"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MedicalDiagramCategory extends Model {
    static associate(models) {
      MedicalDiagramCategory.hasMany(models.MedicalDiagram, {
        foreignKey: "category_id",
        as: "diagrams",
      });
    }
  }

  MedicalDiagramCategory.init(
    {
      category_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING(150), allowNull: false, unique: true },
      code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
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
      modelName: "MedicalDiagramCategory",
      tableName: "medical_diagram_categories",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return MedicalDiagramCategory;
};
