"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("internal_user_profiles", "title_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "user_titles", key: "title_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addIndex("internal_user_profiles", ["title_id"]);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("internal_user_profiles", "title_id");
  },
};
