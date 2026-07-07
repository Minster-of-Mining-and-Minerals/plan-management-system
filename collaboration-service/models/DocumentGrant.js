"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class DocumentGrant extends Model {
    static associate(models) {
      DocumentGrant.belongsTo(models.Document, {
        foreignKey: "document_id",
        as: "document",
        onDelete: "CASCADE",
      });
    }
  }

  DocumentGrant.init(
    {
      document_grant_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      document_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      principal_type: {
        type: DataTypes.ENUM("user", "permission_group"),
        allowNull: false,
      },
      principal_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("viewer", "editor", "manager"),
        allowNull: false,
        defaultValue: "viewer",
      },
      granted_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "DocumentGrant",
      tableName: "document_grants",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return DocumentGrant;
};
