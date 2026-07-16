"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("plan_amendments", {
      plan_amendment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      master_plan_version_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_versions", key: "plan_version_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      amendment_type: {
        type: Sequelize.ENUM(
          "target_reallocation",
          "annual_target_revision",
          "budget_increase",
          "budget_reduction",
          "kpi_addition",
          "kpi_removal",
          "owner_transfer",
          "timeline_extension",
          "plan_correction",
          "custom"
        ),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM(
          "draft",
          "pending_approval",
          "approved",
          "rejected",
          "cancelled",
          "applied"
        ),
        allowNull: false,
        defaultValue: "draft",
      },
      requested_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      requested_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      reviewed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      reviewed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      review_comment: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      applied_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cancelled_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      effective_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("plan_amendments", ["master_plan_version_id"], {
      name: "plan_amendments_master_idx",
    });
    await queryInterface.addIndex("plan_amendments", ["status"], {
      name: "plan_amendments_status_idx",
    });
    await queryInterface.addIndex("plan_amendments", ["amendment_type"], {
      name: "plan_amendments_type_idx",
    });
    await queryInterface.addIndex("plan_amendments", ["requested_by"], {
      name: "plan_amendments_requester_idx",
    });
    await queryInterface.addIndex("plan_amendments", ["requested_at"], {
      name: "plan_amendments_requested_at_idx",
    });
    await queryInterface.addIndex("plan_amendments", ["version"], {
      name: "plan_amendments_version_idx",
    });

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX plan_amendments_master_version_unique
      ON plan_amendments (master_plan_version_id, version)
      WHERE version IS NOT NULL;
    `);

    await queryInterface.createTable("plan_amendment_histories", {
      plan_amendment_history_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      plan_amendment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_amendments", key: "plan_amendment_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      entity_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      field_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      old_value: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      new_value: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      changed_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      changed_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("plan_amendment_histories", ["plan_amendment_id"], {
      name: "plan_amendment_histories_amendment_idx",
    });
    await queryInterface.addIndex(
      "plan_amendment_histories",
      ["entity_type", "entity_id"],
      {
        name: "plan_amendment_histories_entity_idx",
      }
    );
    await queryInterface.addIndex("plan_amendment_histories", ["changed_at"], {
      name: "plan_amendment_histories_changed_at_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("plan_amendment_histories");
    await queryInterface.dropTable("plan_amendments");

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_plan_amendments_amendment_type";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_plan_amendments_status";'
    );
  },
};
