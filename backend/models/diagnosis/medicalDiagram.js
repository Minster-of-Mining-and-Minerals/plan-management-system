"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MedicalDiagram extends Model {
    static associate(models) {
      MedicalDiagram.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
      MedicalDiagram.belongsTo(models.User, {
        foreignKey: "updated_by",
        as: "updater",
      });
    }
  }

  MedicalDiagram.init(
    {
      diagram_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING(255), allowNull: false },
      code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      image_file: { type: DataTypes.STRING(512), allowNull: true },
      category: { type: DataTypes.STRING(64), allowNull: true },
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
      modelName: "MedicalDiagram",
      tableName: "medical_diagrams",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return MedicalDiagram;
};
