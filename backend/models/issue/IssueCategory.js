"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class IssueCategory extends Model {
    static associate(models) {
      IssueCategory.hasMany(models.Issue, {
        foreignKey: "issue_category_id",
        as: "issues",
      });
      IssueCategory.hasMany(models.IssueCategory, {
        foreignKey: "parent_category_id",
        as: "children",
      });
      IssueCategory.belongsTo(models.IssueCategory, {
        foreignKey: "parent_category_id",
        as: "parent",
      });
    }
  }

  IssueCategory.init(
    {
      issue_category_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      parent_category_id: { type: DataTypes.UUID, allowNull: true },
      code: { type: DataTypes.STRING(80), allowNull: true, unique: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      form_config: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      display_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      is_selectable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: "IssueCategory",
      tableName: "issue_categories",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return IssueCategory;
};
