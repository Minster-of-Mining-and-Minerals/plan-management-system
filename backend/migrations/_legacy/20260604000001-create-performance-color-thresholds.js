"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("performance_color_thresholds", {
      performance_color_threshold_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      label: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      min_percentage: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      max_percentage: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      color_hex: {
        type: Sequelize.STRING(7),
        allowNull: false,
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.addIndex("performance_color_thresholds", ["sort_order"]);
    await queryInterface.addIndex("performance_color_thresholds", ["is_active"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("performance_color_thresholds");
  },
};
