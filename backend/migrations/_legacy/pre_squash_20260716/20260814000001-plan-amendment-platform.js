"use strict";

/**
 * Finalize Plan Amendment Framework as a multi-action enterprise platform:
 * - plan_amendment_actions (package actions)
 * - amendment reason / effective mode / expected version / compensating link
 * - action-linked history
 * - plan_rules.amendment_policy
 * - backfill one action per existing amendment
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("plan_amendments", "reason", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("plan_amendments", "effective_mode", {
      type: Sequelize.ENUM("immediate", "next_period", "custom_date"),
      allowNull: false,
      defaultValue: "immediate",
    });

    await queryInterface.addColumn("plan_amendments", "expected_version", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn("plan_amendments", "is_package", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn("plan_amendments", "compensates_amendment_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "plan_amendments", key: "plan_amendment_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.createTable("plan_amendment_actions", {
      plan_amendment_action_id: {
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
      action_type: {
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
      sequence: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      status: {
        type: Sequelize.ENUM("pending", "applied", "failed", "cancelled"),
        allowNull: false,
        defaultValue: "pending",
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      preview: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      impact: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      depends_on_sequence: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      applied_at: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addIndex("plan_amendment_actions", ["plan_amendment_id"], {
      name: "plan_amendment_actions_amendment_idx",
    });
    await queryInterface.addIndex("plan_amendment_actions", ["action_type"], {
      name: "plan_amendment_actions_type_idx",
    });
    await queryInterface.addIndex("plan_amendment_actions", ["status"], {
      name: "plan_amendment_actions_status_idx",
    });
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX plan_amendment_actions_amendment_sequence_unique
      ON plan_amendment_actions (plan_amendment_id, sequence);
    `);

    await queryInterface.addColumn("plan_amendment_histories", "plan_amendment_action_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "plan_amendment_actions", key: "plan_amendment_action_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addIndex(
      "plan_amendment_histories",
      ["plan_amendment_action_id"],
      { name: "plan_amendment_histories_action_idx" }
    );

    await queryInterface.addColumn("plan_rules", "amendment_policy", {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {
        completed_periods_editable: false,
        automatic_redistribution: "manual",
        allow_emergency_approvals: false,
        allow_structural_amendments_after_execution: true,
        allow_ownership_transfer: true,
      },
    });

    // Backfill: one action per existing amendment (metadata stays on amendment for BC).
    await queryInterface.sequelize.query(`
      INSERT INTO plan_amendment_actions (
        plan_amendment_action_id,
        plan_amendment_id,
        action_type,
        sequence,
        status,
        metadata,
        preview,
        impact,
        depends_on_sequence,
        error_message,
        applied_at,
        created_at,
        updated_at
      )
      SELECT
        gen_random_uuid(),
        pa.plan_amendment_id,
        pa.amendment_type,
        1,
        CASE
          WHEN pa.status = 'applied' THEN 'applied'::enum_plan_amendment_actions_status
          WHEN pa.status IN ('rejected', 'cancelled') THEN 'cancelled'::enum_plan_amendment_actions_status
          ELSE 'pending'::enum_plan_amendment_actions_status
        END,
        COALESCE(pa.metadata, '{}'::jsonb),
        NULL,
        NULL,
        NULL,
        NULL,
        pa.applied_at,
        pa.created_at,
        pa.updated_at
      FROM plan_amendments pa
      WHERE NOT EXISTS (
        SELECT 1
        FROM plan_amendment_actions paa
        WHERE paa.plan_amendment_id = pa.plan_amendment_id
      );
    `);

    // Promote description → reason when reason empty.
    await queryInterface.sequelize.query(`
      UPDATE plan_amendments
      SET reason = description
      WHERE reason IS NULL AND description IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("plan_rules", "amendment_policy");

    await queryInterface.removeIndex(
      "plan_amendment_histories",
      "plan_amendment_histories_action_idx"
    );
    await queryInterface.removeColumn("plan_amendment_histories", "plan_amendment_action_id");

    await queryInterface.dropTable("plan_amendment_actions");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_plan_amendment_actions_action_type";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_plan_amendment_actions_status";'
    );

    await queryInterface.removeColumn("plan_amendments", "compensates_amendment_id");
    await queryInterface.removeColumn("plan_amendments", "is_package");
    await queryInterface.removeColumn("plan_amendments", "expected_version");
    await queryInterface.removeColumn("plan_amendments", "effective_mode");
    await queryInterface.removeColumn("plan_amendments", "reason");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_plan_amendments_effective_mode";'
    );
  },
};
