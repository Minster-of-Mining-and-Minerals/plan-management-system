"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CompanyProductionTargetApprovalHistory extends Model {
    static associate(models) {
      CompanyProductionTargetApprovalHistory.belongsTo(models.CompanyProductionAssignment, {
        foreignKey: "assignment_id",
        as: "assignment",
      });

      CompanyProductionTargetApprovalHistory.belongsTo(models.User, {
        foreignKey: "actor_id",
        as: "actor",
      });
    }
  }

  CompanyProductionTargetApprovalHistory.init(
    {
      history_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      assignment_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      version_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      action: {
        type: DataTypes.STRING(50),
        allowNull: false, // 'submitted', 'under_review', 'revision_requested', 'approved', 'rejected'
      },
      previous_status: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      new_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      actor_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "CompanyProductionTargetApprovalHistory",
      tableName: "company_production_target_approval_histories",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return CompanyProductionTargetApprovalHistory;
};
