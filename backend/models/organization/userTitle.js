"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class UserTitle extends Model {
    static associate(models) {
      UserTitle.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
      UserTitle.belongsTo(models.User, {
        foreignKey: "updated_by",
        as: "updater",
      });
      UserTitle.hasMany(models.InternalUserProfile, {
        foreignKey: "title_id",
        as: "staffProfiles",
      });
    }
  }

  UserTitle.init(
    {
      title_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
      },
      code: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },
      status: {
        type: DataTypes.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
      created_by: { type: DataTypes.UUID, allowNull: true },
      updated_by: { type: DataTypes.UUID, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
      deleted_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "UserTitle",
      tableName: "user_titles",
      timestamps: false,
      underscored: true,
      paranoid: true,
      deletedAt: "deleted_at",
    }
  );

  return UserTitle;
};
