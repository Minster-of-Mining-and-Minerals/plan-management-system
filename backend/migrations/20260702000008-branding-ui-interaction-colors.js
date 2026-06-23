"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = {
      sidebar_nav_hover_color: { type: Sequelize.STRING(7), allowNull: false, defaultValue: "#F5E6C8" },
      sidebar_nav_active_color: { type: Sequelize.STRING(7), allowNull: false, defaultValue: "#CA8A04" },
      sidebar_nav_active_text_color: { type: Sequelize.STRING(7), allowNull: false, defaultValue: "#FFFFFF" },
      sidebar_subnav_active_color: { type: Sequelize.STRING(7), allowNull: false, defaultValue: "#F5E6C8" },
      sidebar_subnav_active_text_color: { type: Sequelize.STRING(7), allowNull: false, defaultValue: "#0C4A6E" },
      sidebar_header_text_color: { type: Sequelize.STRING(7), allowNull: false, defaultValue: "#CA8A04" },
      toolbar_button_color: { type: Sequelize.STRING(7), allowNull: false, defaultValue: "#CA8A04" },
      toolbar_button_hover_color: { type: Sequelize.STRING(7), allowNull: false, defaultValue: "#A16207" },
      toolbar_button_text_color: { type: Sequelize.STRING(7), allowNull: false, defaultValue: "#FFFFFF" },
      table_header_color: { type: Sequelize.STRING(7), allowNull: false, defaultValue: "#CA8A04" },
      table_header_hover_color: { type: Sequelize.STRING(7), allowNull: false, defaultValue: "#A16207" },
      table_header_text_color: { type: Sequelize.STRING(7), allowNull: false, defaultValue: "#FFFFFF" },
    };

    for (const [name, definition] of Object.entries(columns)) {
      await queryInterface.addColumn("branding_settings", name, definition);
    }
  },

  async down(queryInterface) {
    const columnNames = [
      "sidebar_nav_hover_color",
      "sidebar_nav_active_color",
      "sidebar_nav_active_text_color",
      "sidebar_subnav_active_color",
      "sidebar_subnav_active_text_color",
      "sidebar_header_text_color",
      "toolbar_button_color",
      "toolbar_button_hover_color",
      "toolbar_button_text_color",
      "table_header_color",
      "table_header_hover_color",
      "table_header_text_color",
    ];

    for (const name of columnNames) {
      await queryInterface.removeColumn("branding_settings", name);
    }
  },
};
