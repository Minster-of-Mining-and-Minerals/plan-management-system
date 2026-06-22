"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Note extends Model {
    static associate(models) {
      Note.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "createdByUser",
      });
      Note.belongsTo(models.User, {
        foreignKey: "updated_by",
        as: "updatedByUser",
      });
      Note.belongsToMany(models.Attachment, {
        through: models.NoteAttachment,
        foreignKey: "note_id",
        otherKey: "attachment_id",
        as: "attachments",
      });
    }
  }

  Note.init(
    {
      note_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: { type: DataTypes.STRING(255), allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "draft",
      },
      is_pinned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      pin_order: { type: DataTypes.INTEGER, allowNull: true },
      is_archived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      created_by: { type: DataTypes.UUID, allowNull: false },
      updated_by: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "Note",
      tableName: "notes",
      timestamps: true,
      paranoid: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
    }
  );

  return Note;
};
