"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class InternalUserProfile extends Model {
    static associate(models) {
      InternalUserProfile.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
      InternalUserProfile.belongsTo(models.Department, {
        foreignKey: "department_id",
        as: "departmentRef",
      });
      InternalUserProfile.belongsTo(models.UserTitle, {
        foreignKey: "title_id",
        as: "titleRef",
      });
    }
  }

  InternalUserProfile.init(
    {
      profile_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      department: { type: DataTypes.STRING(128), allowNull: true },
      department_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      title_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      job_title: { type: DataTypes.STRING(128), allowNull: true },
      employee_id: { type: DataTypes.STRING(64), allowNull: true },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
    },
    {
      sequelize,
      modelName: "InternalUserProfile",
      tableName: "internal_user_profiles",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return InternalUserProfile;
};
