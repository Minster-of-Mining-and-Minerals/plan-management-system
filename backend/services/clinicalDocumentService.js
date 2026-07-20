"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const ClinicalResourceService = require("./clinicalResourceService");
const { ClinicalDocument, DiagnosisFormConfig, User, StaffAppointment } = db;

const VALID_TRANSITIONS = {
  draft: ["in_progress", "submitted", "final", "finalized"],
  in_progress: ["submitted", "draft", "final", "finalized"],
  submitted: ["reviewed", "approved", "finalized", "draft"],
  reviewed: ["approved", "finalized", "draft"],
  approved: ["finalized", "draft"],
  finalized: ["archived"],
  archived: [],
};

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
      signatures = {},
      metadata = {},
    } = data;

    await this.assertPermission(actorId, "clinical_documents", "create");

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
          signatures,
          metadata,
        },
        { transaction: t }
      );

      await this.audit(
        actorId,
        "CREATE",
        "ClinicalDocument",
        document.document_id,
        `Created clinical document of type ${document_type}`,
        null,
        t
      );

      const isFinalState = status === "final" || status === "finalized";
      if (isFinalState) {
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
            metadata: { status, version: 1 },
          },
          t
        );
      } else {
        await this.emitTimeline(
          {
            patient_id,
            appointment_id,
            event_type: `${document_type}_CREATED`,
            title: `Drafted ${title}`,
            description: `Document of type ${document_type} drafted by staff.`,
            actor_id: actorId,
            resource_type: "ClinicalDocument",
            resource_id: document.document_id,
            metadata: { status, version: 1 },
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
      const isFinalized = document.status === "final" || document.status === "finalized";

      if (isFinalized) {
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
            signatures: data.signatures || document.signatures,
            metadata: data.metadata || document.metadata,
          },
          { transaction: t }
        );

        await this.audit(
          actorId,
          "REVISE",
          "ClinicalDocument",
          updatedDoc.document_id,
          `Revised finalized document. Created version ${updatedDoc.version}`,
          null,
          t
        );

        const targetFinal = data.status === "final" || data.status === "finalized";
        if (targetFinal) {
          await this.emitTimeline(
            {
              patient_id: document.patient_id,
              appointment_id: updatedDoc.appointment_id,
              event_type: `${document.document_type}_REVISED`,
              title: `Revised ${updatedDoc.title} (v${updatedDoc.version})`,
              description: `Version ${updatedDoc.version} finalized by staff.`,
              actor_id: actorId,
              resource_type: "ClinicalDocument",
              resource_id: updatedDoc.document_id,
              metadata: { status: data.status, version: updatedDoc.version },
            },
            t
          );
        }
      } else {
        await document.update(
          {
            title: data.title || document.title,
            form_data: data.form_data || document.form_data,
            status: data.status || document.status,
            updated_by: actorId,
            attachment_ids: data.attachment_ids || document.attachment_ids,
            signatures: data.signatures || document.signatures,
            metadata: data.metadata || document.metadata,
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
          null,
          t
        );

        const targetFinal = data.status === "final" || data.status === "finalized";
        if (targetFinal) {
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
              metadata: { status: data.status, version: document.version },
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
   * Transition document status through the clinical lifecycle.
   */
  async transitionStatus(documentId, newStatus, actorId, options = {}) {
    const document = await ClinicalDocument.findByPk(documentId);
    if (!document) {
      const err = new Error("Clinical document not found");
      err.status = 404;
      throw err;
    }

    const currentStatus = document.status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }

    if (["reviewed"].includes(newStatus)) {
      await this.assertPermission(actorId, "clinical_documents", "review");
    } else if (["approved", "finalized", "final"].includes(newStatus)) {
      await this.assertPermission(actorId, "clinical_documents", "approve");
    }

    const t = await db.sequelize.transaction();
    try {
      const updateData = { status: newStatus, updated_by: actorId };
      if (newStatus === "reviewed") {
        updateData.reviewer_id = actorId;
      } else if (newStatus === "approved" || newStatus === "finalized" || newStatus === "final") {
        updateData.approver_id = actorId;
      }

      await document.update(updateData, { transaction: t });

      await this.audit(
        actorId,
        "STATUS_CHANGE",
        "ClinicalDocument",
        documentId,
        `Changed status from ${currentStatus} to ${newStatus}`,
        null,
        t
      );

      await this.emitTimeline(
        {
          patient_id: document.patient_id,
          appointment_id: document.appointment_id,
          event_type: `${document.document_type}_STATUS_CHANGED`,
          title: `${document.title} status: ${newStatus}`,
          description: `Document status transitioned to ${newStatus}.`,
          actor_id: actorId,
          resource_type: "ClinicalDocument",
          resource_id: documentId,
          metadata: { old_status: currentStatus, new_status: newStatus },
        },
        t
      );

      if (newStatus === "submitted") {
        if (options.assignee_id) {
          await db.WorkflowTask.create(
            {
              task_id: uuidv4(),
              patient_id: document.patient_id,
              appointment_id: document.appointment_id,
              assigned_staff_id: options.assignee_id,
              task_type: "CUSTOM",
              resource_type: "ClinicalDocument",
              resource_id: documentId,
              status: "pending",
              notes: `Review requested for document: ${document.title}`,
            },
            { transaction: t }
          );

          await this.sendNotification(
            options.assignee_id,
            {
              title: "Review Requested",
              message: `A review is requested for document: ${document.title}`,
              category: "clinical",
            }
          );
        }
      } else if (newStatus === "reviewed") {
        if (options.assignee_id) {
          await db.WorkflowTask.create(
            {
              task_id: uuidv4(),
              patient_id: document.patient_id,
              appointment_id: document.appointment_id,
              assigned_staff_id: options.assignee_id,
              task_type: "CUSTOM",
              resource_type: "ClinicalDocument",
              resource_id: documentId,
              status: "pending",
              notes: `Approval requested for document: ${document.title}`,
            },
            { transaction: t }
          );

          await this.sendNotification(
            options.assignee_id,
            {
              title: "Approval Requested",
              message: `Approval requested for reviewed document: ${document.title}`,
              category: "clinical",
            }
          );
        }
      } else if (newStatus === "finalized" || newStatus === "final" || newStatus === "approved") {
        await db.WorkflowTask.update(
          { status: "completed" },
          {
            where: {
              resource_type: "ClinicalDocument",
              resource_id: documentId,
              status: "pending",
            },
            transaction: t,
          }
        );

        if (document.created_by) {
          await this.sendNotification(
            document.created_by,
            {
              title: "Document Finalized",
              message: `Your document "${document.title}" has been finalized.`,
              category: "clinical",
            }
          );
        }
      }

      await t.commit();
      return document.get({ plain: true });
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  /**
   * Records digital signature on document.
   */
  async signDocument(documentId, signatureData, actorId) {
    const document = await ClinicalDocument.findByPk(documentId);
    if (!document) {
      const err = new Error("Clinical document not found");
      err.status = 404;
      throw err;
    }

    const { role, signature_value, hash, public_key } = signatureData;
    if (!["author", "reviewer", "approver"].includes(role)) {
      throw new Error("Invalid signature role");
    }

    const actor = await User.findByPk(actorId);
    if (!actor) {
      throw new Error("User not found");
    }

    const signatureEntry = {
      user_id: actorId,
      full_name: actor.full_name,
      signed_at: new Date(),
      signature_value,
      hash: hash || null,
      public_key: public_key || null,
    };

    const signatures = { ...document.signatures, [role]: signatureEntry };

    const t = await db.sequelize.transaction();
    try {
      const updateData = { signatures };
      if (role === "reviewer") {
        updateData.reviewer_id = actorId;
      } else if (role === "approver") {
        updateData.approver_id = actorId;
      }

      await document.update(updateData, { transaction: t });

      await this.audit(
        actorId,
        "SIGN",
        "ClinicalDocument",
        documentId,
        `Signed clinical document as ${role}`,
        null,
        t
      );

      await this.emitTimeline(
        {
          patient_id: document.patient_id,
          appointment_id: document.appointment_id,
          event_type: `${document.document_type}_SIGNED`,
          title: `Signed by ${role}`,
          description: `Document signed by ${actor.full_name} (${role}).`,
          actor_id: actorId,
          resource_type: "ClinicalDocument",
          resource_id: documentId,
          metadata: { role, signed_at: signatureEntry.signed_at },
        },
        t
      );

      await t.commit();
      return document.get({ plain: true });
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
        { model: User, as: "reviewer", attributes: ["user_id", "full_name"] },
        { model: User, as: "approver", attributes: ["user_id", "full_name"] },
        { model: DiagnosisFormConfig, as: "formConfig" },
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
        { model: User, as: "reviewer", attributes: ["user_id", "full_name"] },
        { model: User, as: "approver", attributes: ["user_id", "full_name"] },
        { model: DiagnosisFormConfig, as: "formConfig" },
      ],
      order: [["version", "ASC"]],
    });

    return {
      current: document.get({ plain: true }),
      history: history.map((h) => h.get({ plain: true })),
    };
  }

  /**
   * List clinical documents with flexible filtering.
   */
  async listDocuments(filters = {}, actorId) {
    await this.assertPermission(actorId, "clinical_documents", "read");

    const {
      patient_id,
      appointment_id,
      form_config_id,
      created_by,
      status,
      date_from,
      date_to,
      keyword,
      isPatientPortal = false,
    } = filters;

    const whereClause = {};

    if (patient_id) {
      whereClause.patient_id = patient_id;
    }
    if (appointment_id) {
      whereClause.appointment_id = appointment_id;
    }
    if (form_config_id) {
      whereClause.form_config_id = form_config_id;
    }
    if (created_by) {
      whereClause.created_by = created_by;
    }

    if (status) {
      whereClause.status = status;
    } else if (isPatientPortal) {
      whereClause.status = ["final", "finalized"];
    }

    if (date_from || date_to) {
      whereClause.created_at = {};
      if (date_from) {
        whereClause.created_at[db.Sequelize.Op.gte] = new Date(date_from);
      }
      if (date_to) {
        whereClause.created_at[db.Sequelize.Op.lte] = new Date(date_to);
      }
    }

    if (keyword) {
      whereClause[db.Sequelize.Op.or] = [
        { title: { [db.Sequelize.Op.iLike]: `%${keyword}%` } },
        { document_type: { [db.Sequelize.Op.iLike]: `%${keyword}%` } },
        db.sequelize.literal(`CAST(form_data AS TEXT) ILIKE '%${keyword}%'`),
      ];
    }

    const documents = await ClinicalDocument.findAll({
      where: whereClause,
      include: [
        { model: User, as: "creator", attributes: ["user_id", "full_name"] },
        { model: User, as: "reviewer", attributes: ["user_id", "full_name"] },
        { model: User, as: "approver", attributes: ["user_id", "full_name"] },
        { model: DiagnosisFormConfig, as: "formConfig", attributes: ["config_id", "title"] },
      ],
      order: [["created_at", "DESC"]],
    });

    return documents.map((d) => d.get({ plain: true }));
  }

  /**
   * Standardized listForPatient call redirecting to listDocuments.
   */
  async listForPatient(patientId, options = {}) {
    return this.listDocuments({ patient_id: patientId, ...options }, options.actorId || patientId);
  }
}

module.exports = new ClinicalDocumentService();
