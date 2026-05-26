"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class SystemBranding extends Model {
    static associate() {}
  }

  SystemBranding.init(
    {
      branding_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      system_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      system_name_am: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      tagline: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      logo_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      logo_login_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      primary_hsl: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      accent_hsl: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      sidebar_hover_hsl: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      accent_hover_hsl: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      theme_json: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      slip_config: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "SystemBranding",
      tableName: "system_branding",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return SystemBranding;
};
