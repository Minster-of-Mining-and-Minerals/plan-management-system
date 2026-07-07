"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class DocumentVersion extends Model {
    static associate(models) {
      DocumentVersion.belongsTo(models.Document, {
        foreignKey: "document_id",
        as: "document",
      });
    }
  }

  DocumentVersion.init(
    {
      document_version_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      document_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      version_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      file_path: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      document_key: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      saved_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "DocumentVersion",
      tableName: "document_versions",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return DocumentVersion;
};
