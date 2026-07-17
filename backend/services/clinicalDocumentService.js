"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const ClinicalResourceService = require("./clinicalResourceService");
const { ClinicalDocument, DiagnosisFormConfig, User, StaffAppointment } = db;

class ClinicalDocumentService extends ClinicalResourceService {
  /**
   * Create a new clinical document, validating its template configuration.
   */
  async createDocument(data, actorId) {
    const {
      patient_id,
      appointment_id = null,
      document_type,
      title,
      form_config_id = null,
      form_data = {},
      status = "draft",
      attachment_ids = [],
    } = data;

    await this.assertPermission(actorId, "clinical_documents", "create");

    // Optional: Validate form config exists
    if (form_config_id) {
      const config = await DiagnosisFormConfig.findByPk(form_config_id);
      if (!config) {
        throw new Error(`Dynamic form template config not found: ${form_config_id}`);
      }
    }

    const t = await db.sequelize.transaction();
    try {
      const document = await ClinicalDocument.create(
        {
          document_id: uuidv4(),
          patient_id,
          appointment_id,
          document_type,
          title,
          form_config_id,
          form_data,
          version: 1,
          parent_document_id: null,
          status,
          created_by: actorId,
          updated_by: actorId,
          attachment_ids,
        },
        { transaction: t }
      );

      // Audit and Timeline Event
      await this.audit(
        actorId,
        "CREATE",
        "ClinicalDocument",
        document.document_id,
        `Created clinical document of type ${document_type}`,
        null
      );

      if (status === "final") {
        await this.emitTimeline(
          {
            patient_id,
            appointment_id,
            event_type: `${document_type}_COMPLETED`,
            title: `Completed ${title}`,
            description: `Document of type ${document_type} completed by staff.`,
            actor_id: actorId,
            resource_type: "ClinicalDocument",
            resource_id: document.document_id,
            metadata: { status: "final", version: 1 },
          },
          t
        );
      }

      await t.commit();
      return document.get({ plain: true });
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  /**
   * Update a clinical document. If already finalized, it creates a new version instead.
   */
  async updateDocument(documentId, data, actorId) {
    await this.assertPermission(actorId, "clinical_documents", "update");

    const document = await ClinicalDocument.findByPk(documentId);
    if (!document) {
      const err = new Error("Clinical document not found");
      err.status = 404;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      let updatedDoc;

      if (document.status === "final") {
        // Clinical constraint: finalized documents are immutable. Create new version instead.
        updatedDoc = await ClinicalDocument.create(
          {
            document_id: uuidv4(),
            patient_id: document.patient_id,
            appointment_id: data.appointment_id || document.appointment_id,
            document_type: document.document_type,
            title: data.title || document.title,
            form_config_id: document.form_config_id,
            form_data: data.form_data || document.form_data,
            version: document.version + 1,
            parent_document_id: document.parent_document_id || document.document_id,
            status: data.status || "draft",
            created_by: document.created_by,
            updated_by: actorId,
            attachment_ids: data.attachment_ids || document.attachment_ids,
          },
          { transaction: t }
        );

        await this.audit(
          actorId,
          "REVISE",
          "ClinicalDocument",
          updatedDoc.document_id,
          `Revised finalized document. Created version ${updatedDoc.version}`,
          null
        );

        if (data.status === "final") {
          await this.emitTimeline(
            {
              patient_id: document.patient_id,
              appointment_id: updatedDoc.appointment_id,
              event_type: `${document.document_type}_REVISED`,
              title: `Revised ${updatedDoc.title} (v${updatedDoc.version})`,
              description: `Version ${updatedDoc.version} approved by staff.`,
              actor_id: actorId,
              resource_type: "ClinicalDocument",
              resource_id: updatedDoc.document_id,
              metadata: { status: "final", version: updatedDoc.version },
            },
            t
          );
        }
      } else {
        // Draft can be updated in-place
        await document.update(
          {
            title: data.title || document.title,
            form_data: data.form_data || document.form_data,
            status: data.status || document.status,
            updated_by: actorId,
            attachment_ids: data.attachment_ids || document.attachment_ids,
          },
          { transaction: t }
        );

        updatedDoc = document;

        await this.audit(
          actorId,
          "UPDATE",
          "ClinicalDocument",
          document.document_id,
          `Updated clinical document draft`,
          null
        );

        if (data.status === "final") {
          await this.emitTimeline(
            {
              patient_id: document.patient_id,
              appointment_id: document.appointment_id,
              event_type: `${document.document_type}_COMPLETED`,
              title: `Completed ${document.title}`,
              description: `Document draft finalized by staff.`,
              actor_id: actorId,
              resource_type: "ClinicalDocument",
              resource_id: document.document_id,
              metadata: { status: "final", version: document.version },
            },
            t
          );
        }
      }

      await t.commit();
      return updatedDoc.get({ plain: true });
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  /**
   * Get clinical document details along with entire version history.
   */
  async getDocumentWithHistory(documentId) {
    const document = await ClinicalDocument.findByPk(documentId, {
      include: [
        { model: User, as: "creator", attributes: ["user_id", "full_name"] },
        { model: User, as: "updater", attributes: ["user_id", "full_name"] },
      ],
    });

    if (!document) return null;

    const parentId = document.parent_document_id || document.document_id;
    const history = await ClinicalDocument.findAll({
      where: {
        [db.Sequelize.Op.or]: [
          { document_id: parentId },
          { parent_document_id: parentId },
        ],
      },
      include: [
        { model: User, as: "creator", attributes: ["user_id", "full_name"] },
        { model: User, as: "updater", attributes: ["user_id", "full_name"] },
      ],
      order: [["version", "ASC"]],
    });

    return {
      current: document.get({ plain: true }),
      history: history.map((h) => h.get({ plain: true })),
    };
  }

  /**
   * List clinical documents for a patient, respecting portal restrictions if specified.
   */
  async listForPatient(patientId, options = {}) {
    const { isPatientPortal = false } = options;

    const whereClause = { patient_id: patientId };
    if (isPatientPortal) {
      whereClause.status = "final";
    }

    const documents = await ClinicalDocument.findAll({
      where: whereClause,
      include: [
        { model: User, as: "creator", attributes: ["user_id", "full_name"] },
        { model: DiagnosisFormConfig, as: "formConfig", attributes: ["config_id", "title"] },
      ],
      order: [["created_at", "DESC"]],
    });

    return documents.map((d) => d.get({ plain: true }));
  }
}

module.exports = new ClinicalDocumentService();
