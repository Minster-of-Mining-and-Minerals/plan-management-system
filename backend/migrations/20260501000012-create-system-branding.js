"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("system_branding", {
      branding_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      system_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      system_name_am: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      tagline: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      logo_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
        defaultValue: "/logo-only.png",
      },
      logo_login_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
        defaultValue: "/logo-mom.png",
      },
      primary_hsl: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "201 85% 18%",
      },
      golden_dark_hsl: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "45, 80%, 40%",
      },
      golden_metallic_hsl: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "43, 85%, 55%, 10%",
      },
      golden_dark_hover_hsl: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "45, 80%, 40%, 90%",
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("system_branding");
  },
};
