"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  addColumnIfNotExists,
  removeColumnIfExists,
  createIndexIfNotExists,
  dropIndexIfExists,
} = require("./helpers/schemaHelpers");

const TOP_CATEGORIES = [
  {
    code: "plan_content",
    name: "Plan Content & Structure",
    description:
      "Requests to add or change strategic focus areas, goals, KPIs, naming, or plan structure.",
    display_order: 1,
  },
  {
    code: "target_correction",
    name: "Target & Value Correction",
    description: "Corrections to period, goal, KPI, or allocation targets and values.",
    display_order: 2,
  },
  {
    code: "system_process",
    name: "System & Process",
    description: "Platform, account, access, performance, or workflow problems.",
    display_order: 3,
  },
  {
    code: "evaluation_quality",
    name: "Evaluation & Quality",
    description: "Inconsistent evaluation, reporting accuracy, or review process concerns.",
    display_order: 4,
  },
];

const SUB_CATEGORIES = [
  {
    parentCode: "plan_content",
    code: "add_strategic_focus",
    name: "Request New Strategic Focus",
    description: "Propose adding a new strategic focus area to the plan.",
    display_order: 1,
    form_config: {
      fields: [
        {
          key: "proposed_name",
          label: "Proposed Strategic Focus Name",
          type: "text",
          required: true,
          placeholder: "Name of the proposed strategic focus",
        },
        {
          key: "proposed_description",
          label: "Proposed Description",
          type: "textarea",
          required: true,
          placeholder: "Describe the strategic focus and expected outcomes",
        },
        {
          key: "alignment_rationale",
          label: "Strategic Alignment Rationale",
          type: "textarea",
          required: false,
          placeholder: "Why this focus should be included in the plan",
        },
      ],
      standardFields: {
        current_value: { visible: false, required: false },
        suggested_value: { visible: false, required: false },
        entity_type: {
          visible: true,
          required: true,
          allowedTypes: ["plan_version", "strategic"],
        },
      },
    },
  },
  {
    parentCode: "plan_content",
    code: "add_goal",
    name: "Request New Goal",
    description: "Propose adding a new goal under an existing objective or focus area.",
    display_order: 2,
    form_config: {
      fields: [
        {
          key: "proposed_name",
          label: "Proposed Goal Name",
          type: "text",
          required: true,
        },
        {
          key: "proposed_description",
          label: "Proposed Goal Description",
          type: "textarea",
          required: true,
        },
        {
          key: "parent_context",
          label: "Parent Objective / Focus Context",
          type: "textarea",
          required: true,
          placeholder: "Which objective or strategic focus should this goal sit under?",
        },
      ],
      standardFields: {
        current_value: { visible: false, required: false },
        suggested_value: { visible: false, required: false },
        entity_type: {
          visible: true,
          required: true,
          allowedTypes: ["plan_version", "strategic", "objective", "goal"],
        },
      },
    },
  },
  {
    parentCode: "plan_content",
    code: "add_kpi",
    name: "Request New KPI",
    description: "Propose adding a new KPI under an existing goal or objective.",
    display_order: 3,
    form_config: {
      fields: [
        {
          key: "proposed_name",
          label: "Proposed KPI Name",
          type: "text",
          required: true,
        },
        {
          key: "proposed_description",
          label: "Proposed KPI Description",
          type: "textarea",
          required: true,
        },
        {
          key: "measurement_unit",
          label: "Measurement Unit",
          type: "text",
          required: false,
          placeholder: "e.g. %, count, ETB",
        },
        {
          key: "target_hint",
          label: "Suggested Target (optional)",
          type: "text",
          required: false,
        },
      ],
      standardFields: {
        current_value: { visible: false, required: false },
        suggested_value: { visible: false, required: false },
        entity_type: {
          visible: true,
          required: true,
          allowedTypes: ["objective", "goal", "kpi", "strategic"],
        },
      },
    },
  },
  {
    parentCode: "plan_content",
    code: "modify_node_content",
    name: "Modify Name or Description",
    description: "Correct naming, labeling, or descriptive content on an existing plan node.",
    display_order: 4,
    form_config: {
      fields: [],
      standardFields: {
        current_value: { visible: true, required: true },
        suggested_value: { visible: true, required: true },
      },
    },
  },
  {
    parentCode: "plan_content",
    code: "structural_recommendation",
    name: "Structural Recommendation",
    description: "Broader recommendation about plan hierarchy or structure.",
    display_order: 5,
    form_config: {
      fields: [
        {
          key: "recommended_change",
          label: "Recommended Structural Change",
          type: "textarea",
          required: true,
        },
        {
          key: "expected_benefit",
          label: "Expected Benefit",
          type: "textarea",
          required: false,
        },
      ],
      standardFields: {
        current_value: { visible: false, required: false },
        suggested_value: { visible: false, required: false },
      },
    },
  },
  {
    parentCode: "target_correction",
    code: "modify_period_target",
    name: "Modify Period Target",
    description: "Correct a target value at execution period level.",
    display_order: 1,
    form_config: {
      fields: [],
      standardFields: {
        current_value: { visible: true, required: true },
        suggested_value: { visible: true, required: true },
        entity_type: {
          visible: true,
          required: true,
          allowedTypes: ["plan_version", "target"],
        },
      },
    },
  },
  {
    parentCode: "target_correction",
    code: "modify_goal_target",
    name: "Modify Goal Target",
    description: "Correct a target value linked to a goal or objective.",
    display_order: 2,
    form_config: {
      fields: [],
      standardFields: {
        current_value: { visible: true, required: true },
        suggested_value: { visible: true, required: true },
        entity_type: {
          visible: true,
          required: true,
          allowedTypes: ["objective", "goal", "target"],
        },
      },
    },
  },
  {
    parentCode: "target_correction",
    code: "modify_kpi_target",
    name: "Modify KPI Target",
    description: "Correct a KPI target, threshold, or measurement value.",
    display_order: 3,
    form_config: {
      fields: [],
      standardFields: {
        current_value: { visible: true, required: true },
        suggested_value: { visible: true, required: true },
        entity_type: {
          visible: true,
          required: true,
          allowedTypes: ["kpi", "target"],
        },
      },
    },
  },
  {
    parentCode: "target_correction",
    code: "modify_allocation",
    name: "Modify Budget or Allocation",
    description: "Correct budget, funding, or resource allocation values.",
    display_order: 4,
    form_config: {
      fields: [],
      standardFields: {
        current_value: { visible: true, required: true },
        suggested_value: { visible: true, required: true },
        entity_type: {
          visible: true,
          required: true,
          allowedTypes: ["budget", "target", "plan_version"],
        },
      },
    },
  },
  {
    parentCode: "system_process",
    code: "account_access",
    name: "Account or Access Issue",
    description: "Login, permissions, role, or account-related problems.",
    display_order: 1,
    form_config: {
      fields: [
        {
          key: "affected_area",
          label: "Affected Area",
          type: "select",
          required: true,
          options: [
            { value: "login", label: "Login / Authentication" },
            { value: "permissions", label: "Permissions / Roles" },
            { value: "profile", label: "User Profile" },
            { value: "notifications", label: "Notifications" },
            { value: "other", label: "Other" },
          ],
        },
        {
          key: "observed_behavior",
          label: "Observed Behavior",
          type: "textarea",
          required: true,
        },
        {
          key: "steps_to_reproduce",
          label: "Steps to Reproduce",
          type: "textarea",
          required: false,
        },
      ],
      standardFields: {
        current_value: { visible: false, required: false },
        suggested_value: { visible: false, required: false },
        entity_type: {
          visible: true,
          required: true,
          allowedTypes: ["plan_version"],
        },
      },
    },
  },
  {
    parentCode: "system_process",
    code: "system_performance",
    name: "System Performance Problem",
    description: "Slow loading, timeouts, or degraded platform performance.",
    display_order: 2,
    form_config: {
      fields: [
        {
          key: "affected_area",
          label: "Affected Screen or Module",
          type: "text",
          required: true,
        },
        {
          key: "observed_behavior",
          label: "Observed Behavior",
          type: "textarea",
          required: true,
        },
        {
          key: "frequency",
          label: "How Often It Occurs",
          type: "select",
          required: false,
          options: [
            { value: "always", label: "Always" },
            { value: "often", label: "Often" },
            { value: "sometimes", label: "Sometimes" },
            { value: "once", label: "Once" },
          ],
        },
      ],
      standardFields: {
        current_value: { visible: false, required: false },
        suggested_value: { visible: false, required: false },
        entity_type: {
          visible: true,
          required: true,
          allowedTypes: ["plan_version"],
        },
      },
    },
  },
  {
    parentCode: "system_process",
    code: "data_display",
    name: "Data Display or Sync Issue",
    description: "Incorrect, missing, or out-of-sync data shown in the system.",
    display_order: 3,
    form_config: {
      fields: [
        {
          key: "affected_data",
          label: "Affected Data or Field",
          type: "text",
          required: true,
        },
        {
          key: "expected_value",
          label: "Expected Value / State",
          type: "textarea",
          required: true,
        },
        {
          key: "actual_value",
          label: "Actual Value / State Shown",
          type: "textarea",
          required: true,
        },
      ],
      standardFields: {
        current_value: { visible: false, required: false },
        suggested_value: { visible: false, required: false },
      },
    },
  },
  {
    parentCode: "system_process",
    code: "general_system",
    name: "General System Issue",
    description: "Other platform or workflow issues not covered above.",
    display_order: 4,
    form_config: {
      fields: [
        {
          key: "system_area",
          label: "System Area",
          type: "text",
          required: true,
        },
        {
          key: "impact_description",
          label: "Impact Description",
          type: "textarea",
          required: true,
        },
      ],
      standardFields: {
        current_value: { visible: false, required: false },
        suggested_value: { visible: false, required: false },
      },
    },
  },
  {
    parentCode: "evaluation_quality",
    code: "inconsistent_evaluation",
    name: "Inconsistent Evaluation",
    description: "Evaluation criteria applied inconsistently across entities or reviewers.",
    display_order: 1,
    form_config: {
      fields: [
        {
          key: "evaluation_context",
          label: "Evaluation Context",
          type: "textarea",
          required: true,
        },
        {
          key: "expected_outcome",
          label: "Expected Evaluation Outcome",
          type: "textarea",
          required: true,
        },
        {
          key: "actual_outcome",
          label: "Actual Evaluation Outcome",
          type: "textarea",
          required: true,
        },
      ],
      standardFields: {
        current_value: { visible: false, required: false },
        suggested_value: { visible: false, required: false },
      },
    },
  },
  {
    parentCode: "evaluation_quality",
    code: "reporting_accuracy",
    name: "Reporting or Performance Data Issue",
    description: "Concerns about mal performance reporting or inaccurate metrics.",
    display_order: 2,
    form_config: {
      fields: [
        {
          key: "metric_or_report",
          label: "Metric or Report Name",
          type: "text",
          required: true,
        },
        {
          key: "reported_value",
          label: "Reported Value",
          type: "textarea",
          required: true,
        },
        {
          key: "expected_value",
          label: "Expected / Correct Value",
          type: "textarea",
          required: true,
        },
      ],
      standardFields: {
        current_value: { visible: false, required: false },
        suggested_value: { visible: false, required: false },
      },
    },
  },
  {
    parentCode: "evaluation_quality",
    code: "review_process",
    name: "Review Process Concern",
    description: "Issues with the review workflow, timing, or reviewer process.",
    display_order: 3,
    form_config: {
      fields: [
        {
          key: "process_step",
          label: "Review Step or Stage",
          type: "text",
          required: true,
        },
        {
          key: "concern_description",
          label: "Concern Description",
          type: "textarea",
          required: true,
        },
        {
          key: "suggested_improvement",
          label: "Suggested Improvement",
          type: "textarea",
          required: false,
        },
      ],
      standardFields: {
        current_value: { visible: false, required: false },
        suggested_value: { visible: false, required: false },
      },
    },
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await addColumnIfNotExists(queryInterface, "issue_categories", "parent_category_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "issue_categories", key: "issue_category_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await addColumnIfNotExists(queryInterface, "issue_categories", "code", {
      type: Sequelize.STRING(80),
      allowNull: true,
      unique: true,
    });

    await addColumnIfNotExists(queryInterface, "issue_categories", "form_config", {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    });

    await addColumnIfNotExists(queryInterface, "issue_categories", "is_selectable", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await addColumnIfNotExists(queryInterface, "issues", "form_data", {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    });

    await createIndexIfNotExists(
      queryInterface,
      "idx_issue_categories_parent",
      `CREATE INDEX IF NOT EXISTS idx_issue_categories_parent ON issue_categories (parent_category_id)`
    );

    await createIndexIfNotExists(
      queryInterface,
      "idx_issue_categories_code",
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_issue_categories_code ON issue_categories (code) WHERE code IS NOT NULL`
    );

    const now = new Date();
    const topIdsByCode = {};

    await queryInterface.sequelize.query(`
      UPDATE issue_categories SET is_active = false, updated_at = NOW()
      WHERE code IS NULL OR code NOT IN (${TOP_CATEGORIES.map((c) => `'${c.code}'`).join(", ")})
    `);

    for (const top of TOP_CATEGORIES) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT issue_category_id FROM issue_categories WHERE code = :code LIMIT 1`,
        {
          replacements: { code: top.code },
          type: queryInterface.sequelize.QueryTypes.SELECT,
        }
      );

      if (existing?.issue_category_id) {
        topIdsByCode[top.code] = existing.issue_category_id;
        await queryInterface.sequelize.query(
          `UPDATE issue_categories SET
            name = :name,
            description = :description,
            display_order = :displayOrder,
            parent_category_id = NULL,
            is_selectable = false,
            is_active = true,
            form_config = :formConfig::jsonb,
            updated_at = :updatedAt
          WHERE issue_category_id = :id`,
          {
            replacements: {
              name: top.name,
              description: top.description,
              displayOrder: top.display_order,
              formConfig: JSON.stringify({ fields: [], standardFields: {} }),
              updatedAt: now,
              id: existing.issue_category_id,
            },
          }
        );
      } else {
        const issueCategoryId = uuidv4();
        topIdsByCode[top.code] = issueCategoryId;
        await queryInterface.bulkInsert("issue_categories", [
          {
            issue_category_id: issueCategoryId,
            parent_category_id: null,
            code: top.code,
            name: top.name,
            description: top.description,
            display_order: top.display_order,
            form_config: Sequelize.literal(`'{"fields":[],"standardFields":{}}'::jsonb`),
            is_selectable: false,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }

    for (const sub of SUB_CATEGORIES) {
      const parentId = topIdsByCode[sub.parentCode];
      if (!parentId) continue;

      const [existing] = await queryInterface.sequelize.query(
        `SELECT issue_category_id FROM issue_categories WHERE code = :code LIMIT 1`,
        {
          replacements: { code: sub.code },
          type: queryInterface.sequelize.QueryTypes.SELECT,
        }
      );

      const row = {
        issue_category_id: uuidv4(),
        parent_category_id: parentId,
        code: sub.code,
        name: sub.name,
        description: sub.description,
        display_order: sub.display_order,
        form_config: Sequelize.literal(`'${JSON.stringify(sub.form_config).replace(/'/g, "''")}'::jsonb`),
        is_selectable: true,
        is_active: true,
        created_at: now,
        updated_at: now,
      };

      if (existing?.issue_category_id) {
        await queryInterface.sequelize.query(
          `UPDATE issue_categories SET
            parent_category_id = :parentId,
            code = :code,
            name = :name,
            description = :description,
            display_order = :displayOrder,
            form_config = :formConfig::jsonb,
            is_selectable = true,
            is_active = true,
            updated_at = :updatedAt
          WHERE issue_category_id = :id`,
          {
            replacements: {
              parentId,
              code: sub.code,
              name: sub.name,
              description: sub.description,
              displayOrder: sub.display_order,
              formConfig: JSON.stringify(sub.form_config),
              updatedAt: now,
              id: existing.issue_category_id,
            },
          }
        );
      } else {
        await queryInterface.bulkInsert("issue_categories", [row]);
      }
    }
  },

  async down(queryInterface) {
    await dropIndexIfExists(queryInterface, "issue_categories", "idx_issue_categories_code");
    await dropIndexIfExists(queryInterface, "issue_categories", "idx_issue_categories_parent");

    await removeColumnIfExists(queryInterface, "issues", "form_data");
    await removeColumnIfExists(queryInterface, "issue_categories", "is_selectable");
    await removeColumnIfExists(queryInterface, "issue_categories", "form_config");
    await removeColumnIfExists(queryInterface, "issue_categories", "code");
    await removeColumnIfExists(queryInterface, "issue_categories", "parent_category_id");
  },
};
