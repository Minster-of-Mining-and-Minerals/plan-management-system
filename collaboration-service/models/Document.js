"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Document extends Model {
    static associate(models) {
      Document.hasMany(models.DocumentVersion, {
        foreignKey: "document_id",
        as: "versions",
        onDelete: "CASCADE",
      });
    }
  }

  Document.init(
    {
      document_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      file_path: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      mime_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      file_type: {
        type: DataTypes.ENUM("docx", "xlsx", "pptx", "pdf"),
        allowNull: false,
        defaultValue: "docx",
      },
      file_size: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      document_key: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      version_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      status: {
        type: DataTypes.ENUM("draft", "finalized"),
        allowNull: false,
        defaultValue: "draft",
      },
      owner_app: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "plan-management",
      },
      owner_type: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "standalone",
      },
      owner_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      updated_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Document",
      tableName: "documents",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Document;
};
