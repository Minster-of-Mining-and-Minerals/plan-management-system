"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create table company_production_target_amendments
    await queryInterface.createTable("company_production_target_amendments", {
      amendment_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      assignment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "company_production_assignments",
          key: "assignment_id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      amendment_reference: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
      },
      current_approved_version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      proposed_version_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 2,
      },
      current_annual_target: {
        type: Sequelize.DECIMAL(16, 4),
        allowNull: false,
        defaultValue: 0,
      },
      proposed_annual_target: {
        type: Sequelize.DECIMAL(16, 4),
        allowNull: false,
      },
      amendment_reason: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      submission_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      review_comments: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      effective_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "amendment_submitted",
      },
      submitted_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      submitted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      reviewed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      reviewed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      activated_at: {
        type: Sequelize.DATE,
        allowNull: true,
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

    // 2. Add amendment_id and is_amendment to company_production_targets
    const targetsDesc = await queryInterface.describeTable("company_production_targets");
    if (!targetsDesc.amendment_id) {
      await queryInterface.addColumn("company_production_targets", "amendment_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "company_production_target_amendments",
          key: "amendment_id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
    }

    if (!targetsDesc.is_amendment) {
      await queryInterface.addColumn("company_production_targets", "is_amendment", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    // 3. Add amendment_id to company_production_target_approval_histories
    const historyDesc = await queryInterface.describeTable("company_production_target_approval_histories");
    if (!historyDesc.amendment_id) {
      await queryInterface.addColumn("company_production_target_approval_histories", "amendment_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "company_production_target_amendments",
          key: "amendment_id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
    }
  },

  down: async (queryInterface) => {
    try {
      await queryInterface.removeColumn("company_production_target_approval_histories", "amendment_id");
    } catch (e) {}

    try {
      await queryInterface.removeColumn("company_production_targets", "is_amendment");
      await queryInterface.removeColumn("company_production_targets", "amendment_id");
    } catch (e) {}

    await queryInterface.dropTable("company_production_target_amendments");
  },
};
