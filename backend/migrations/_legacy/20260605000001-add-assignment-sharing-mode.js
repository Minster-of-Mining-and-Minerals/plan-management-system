"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("plan_nodes", "assignment_sharing_mode", {
      type: Sequelize.ENUM("exclusive", "shared"),
      allowNull: false,
      defaultValue: "exclusive",
    });

    await queryInterface.addColumn("external_assignments", "is_active", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await queryInterface.addColumn("internal_assignments", "is_active", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await queryInterface.addColumn("internal_assignments", "branch_external_assignment_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "external_assignments",
        key: "external_assignment_id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("internal_assignments", "branch_internal_assignment_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "internal_assignments",
        key: "internal_assignment_id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.removeIndex(
      "external_assignments",
      "external_assignments_node_govt_unique"
    );

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX external_assignments_active_node_govt_unique
      ON external_assignments (plan_node_id, government_structure_id)
      WHERE is_active = true
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX internal_assignments_active_node_dept_unique
      ON internal_assignments (plan_node_id, internal_structure_id)
      WHERE is_active = true AND internal_structure_id IS NOT NULL
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX internal_assignments_active_node_user_unique
      ON internal_assignments (plan_node_id, user_id)
      WHERE is_active = true AND user_id IS NOT NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS internal_assignments_active_node_user_unique`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS internal_assignments_active_node_dept_unique`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS external_assignments_active_node_govt_unique`
    );

    await queryInterface.addIndex("external_assignments", {
      unique: true,
      fields: ["plan_node_id", "government_structure_id"],
      name: "external_assignments_node_govt_unique",
    });

    await queryInterface.removeColumn("internal_assignments", "branch_internal_assignment_id");
    await queryInterface.removeColumn("internal_assignments", "branch_external_assignment_id");
    await queryInterface.removeColumn("internal_assignments", "is_active");
    await queryInterface.removeColumn("external_assignments", "is_active");
    await queryInterface.removeColumn("plan_nodes", "assignment_sharing_mode");
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_plan_nodes_assignment_sharing_mode"`
    );
  },
};
