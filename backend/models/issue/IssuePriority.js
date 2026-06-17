"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class IssuePriority extends Model {
    static associate(models) {
      IssuePriority.hasMany(models.Issue, {
        foreignKey: "issue_priority_id",
        as: "issues",
      });
    }
  }

  IssuePriority.init(
    {
      issue_priority_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      label: { type: DataTypes.STRING(100), allowNull: false },
      display_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      color_hex: { type: DataTypes.STRING(7), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: "IssuePriority",
      tableName: "issue_priorities",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return IssuePriority;
};
