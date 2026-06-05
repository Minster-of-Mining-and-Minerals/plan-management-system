"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class UserSuggestionUsage extends Model {
    static associate(models) {
      UserSuggestionUsage.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
      UserSuggestionUsage.belongsTo(models.ClinicalSuggestion, {
        foreignKey: "suggestion_id",
        as: "suggestion",
      });
    }
  }

  UserSuggestionUsage.init(
    {
      usage_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: { type: DataTypes.UUID, allowNull: false },
      suggestion_id: { type: DataTypes.UUID, allowNull: false },
      usage_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      last_used_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "UserSuggestionUsage",
      tableName: "user_suggestion_usage",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return UserSuggestionUsage;
};
