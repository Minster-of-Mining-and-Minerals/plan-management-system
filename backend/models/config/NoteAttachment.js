"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class NoteAttachment extends Model {
    static associate(models) {
      NoteAttachment.belongsTo(models.Note, {
        foreignKey: "note_id",
        as: "note",
      });
      NoteAttachment.belongsTo(models.Attachment, {
        foreignKey: "attachment_id",
        as: "attachment",
      });
    }
  }

  NoteAttachment.init(
    {
      note_attachment_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      note_id: { type: DataTypes.UUID, allowNull: false },
      attachment_id: { type: DataTypes.UUID, allowNull: false },
    },
    {
      sequelize,
      modelName: "NoteAttachment",
      tableName: "note_attachments",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return NoteAttachment;
};
