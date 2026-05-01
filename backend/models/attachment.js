"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Attachment extends Model {
    static associate(models) {
      // Junction: Attachment ↔ Complaint
      // Attachment.hasMany(models.ComplaintAttachment, {
      //   foreignKey: "attachment_id",
      //   as: "complaintAttachments",
      // });
    }
  }

  Attachment.init(
    {
      attachment_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      file_path: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      uploaded_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "Attachment",
      tableName: "attachments",
      timestamps: false,
      underscored: true,
    },
  );

  return Attachment;
};
