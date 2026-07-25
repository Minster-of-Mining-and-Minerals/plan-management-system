"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.showAllTables();

    // 1. Extend radiology_images with viewer fields
    const imageTableDescription = await queryInterface.describeTable("radiology_images");
    if (!imageTableDescription.viewer_type) {
      await queryInterface.addColumn("radiology_images", "viewer_type", {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "OHIF", // OHIF, CORNERSTONE, ORTHANC, HOSPITAL_PACS
      });
    }
    if (!imageTableDescription.viewer_configuration) {
      await queryInterface.addColumn("radiology_images", "viewer_configuration", {
        type: Sequelize.JSONB,
        allowNull: true,
      });
    }
    if (!imageTableDescription.external_viewer_url) {
      await queryInterface.addColumn("radiology_images", "external_viewer_url", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    // 2. Create radiology_report_templates
    if (!tableExists.includes("radiology_report_templates")) {
      await queryInterface.createTable("radiology_report_templates", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        procedure_type: {
          type: Sequelize.STRING(128),
          allowNull: true,
        },
        modality: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "XRAY",
        },
        active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      });
    }

    // 3. Create radiology_report_template_sections
    if (!tableExists.includes("radiology_report_template_sections")) {
      await queryInterface.createTable("radiology_report_template_sections", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        template_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "radiology_report_templates",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        section_name: {
          type: Sequelize.STRING(128),
          allowNull: false,
        },
        display_order: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        required: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        default_text: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      });

      await queryInterface.addIndex("radiology_report_template_sections", ["template_id"]);
    }

    // 4. Extend radiology_reports with template_id & structured_sections
    const reportTableDescription = await queryInterface.describeTable("radiology_reports");
    if (!reportTableDescription.template_id) {
      await queryInterface.addColumn("radiology_reports", "template_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "radiology_report_templates",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }
    if (!reportTableDescription.structured_sections) {
      await queryInterface.addColumn("radiology_reports", "structured_sections", {
        type: Sequelize.JSONB,
        allowNull: true,
      });
    }

    // 5. Create radiology_critical_alerts
    if (!tableExists.includes("radiology_critical_alerts")) {
      await queryInterface.createTable("radiology_critical_alerts", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        study_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "radiology_studies",
            key: "study_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        created_by: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "users",
            key: "user_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        severity: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "CRITICAL", // CRITICAL, URGENT, SEVERE
        },
        finding: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        recipient_doctor_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "users",
            key: "user_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "OPEN", // OPEN, ACKNOWLEDGED, CLOSED
        },
        acknowledged_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        acknowledged_by: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "users",
            key: "user_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      });

      await queryInterface.addIndex("radiology_critical_alerts", ["study_id"]);
      await queryInterface.addIndex("radiology_critical_alerts", ["recipient_doctor_id"]);
      await queryInterface.addIndex("radiology_critical_alerts", ["status"]);
    }

    // 6. Create radiology_resources
    if (!tableExists.includes("radiology_resources")) {
      await queryInterface.createTable("radiology_resources", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        resource_type: {
          type: Sequelize.STRING(64),
          allowNull: false, // CT_SCANNER, MRI_MACHINE, ULTRASOUND_ROOM, XRAY_ROOM
        },
        location: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      });
    }

    // 7. Create radiology_resource_availability
    if (!tableExists.includes("radiology_resource_availability")) {
      await queryInterface.createTable("radiology_resource_availability", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        resource_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "radiology_resources",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        available_from: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        available_to: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        maintenance_block: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        study_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "radiology_studies",
            key: "study_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      });

      await queryInterface.addIndex("radiology_resource_availability", ["resource_id"]);
    }

    // 8. Create radiology_external_studies
    if (!tableExists.includes("radiology_external_studies")) {
      await queryInterface.createTable("radiology_external_studies", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        patient_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "users",
            key: "user_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        source_facility: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        study_date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        modality: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "XRAY",
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        report_attachment: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        image_reference: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        uploaded_by: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "users",
            key: "user_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      });

      await queryInterface.addIndex("radiology_external_studies", ["patient_id"]);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("radiology_external_studies");
    await queryInterface.dropTable("radiology_resource_availability");
    await queryInterface.dropTable("radiology_resources");
    await queryInterface.dropTable("radiology_critical_alerts");

    const reportTableDescription = await queryInterface.describeTable("radiology_reports");
    if (reportTableDescription.structured_sections) {
      await queryInterface.removeColumn("radiology_reports", "structured_sections");
    }
    if (reportTableDescription.template_id) {
      await queryInterface.removeColumn("radiology_reports", "template_id");
    }

    await queryInterface.dropTable("radiology_report_template_sections");
    await queryInterface.dropTable("radiology_report_templates");

    const imageTableDescription = await queryInterface.describeTable("radiology_images");
    if (imageTableDescription.external_viewer_url) {
      await queryInterface.removeColumn("radiology_images", "external_viewer_url");
    }
    if (imageTableDescription.viewer_configuration) {
      await queryInterface.removeColumn("radiology_images", "viewer_configuration");
    }
    if (imageTableDescription.viewer_type) {
      await queryInterface.removeColumn("radiology_images", "viewer_type");
    }
  },
};
