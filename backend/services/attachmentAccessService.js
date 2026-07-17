"use strict";

const { Op } = require("sequelize");
const db = require("../models");
const { userHasPermission } = require("./userPermissionService");
const { ACCOUNT_TYPES } = require("../config/accountTypes");

const {
  Attachment,
  MedicalHistoryLog,
  PrescriptionPharmacyForwardFile,
  PrescriptionPharmacyForward,
  PharmacyUserProfile,
} = db;

const RESOURCE_TYPES = Object.freeze({
  APPOINTMENT: "appointment",
  PATIENT: "patient",
  PHARMACY_FORWARD: "pharmacy_forward",
  USER_PROFILE: "user_profile",
  GENERIC: "generic",
});

function deny(status, message) {
  const err = new Error(message || "Forbidden");
  err.status = status;
  err.expose = true;
  return err;
}

/**
 * Soft-deny for IDOR: never confirm that an attachment exists to unauthorized callers.
 */
function notFound() {
  return deny(404, "Attachment not found");
}

async function hasAttachmentPerm(userId, action) {
  if (!userId) return false;
  if (await userHasPermission(userId, "attachments", "manage")) return true;
  return userHasPermission(userId, "attachments", action);
}

async function canUpload(user) {
  const userId = user?.user_id;
  if (!userId) return false;
  if (await hasAttachmentPerm(userId, "create")) return true;
  // Clinical / portal upload paths used before dedicated attachment perms existed
  if (user.account_type === ACCOUNT_TYPES.PATIENT) return true;
  if (user.account_type === ACCOUNT_TYPES.PHARMACY) {
    return userHasPermission(userId, "pharmacy_prescription", "send");
  }
  return (
    (await userHasPermission(userId, "patients", "update")) ||
    (await userHasPermission(userId, "patients", "create")) ||
    (await userHasPermission(userId, "workflow", "submit")) ||
    (await userHasPermission(userId, "users", "update"))
  );
}

async function resolveLinkedAppointmentIds(attachmentId) {
  const logs = await MedicalHistoryLog.findAll({
    attributes: ["appointment_id"],
    where: {
      attachment_ids: { [Op.contains]: [attachmentId] },
    },
    limit: 20,
  });
  return [...new Set(logs.map((l) => l.appointment_id).filter(Boolean))];
}

async function resolvePharmacyForwardAccess(userId, forwardId) {
  if (!forwardId) return false;
  const forward = await PrescriptionPharmacyForward.findByPk(forwardId, {
    attributes: ["forward_id", "pharmacy_id"],
  });
  if (!forward) return false;
  const link = await PharmacyUserProfile.findOne({
    where: { user_id: userId, pharmacy_id: forward.pharmacy_id, is_active: true },
  });
  return Boolean(link);
}

async function attachmentLinkedToPharmacyUser(attachmentId, userId) {
  const rows = await PrescriptionPharmacyForwardFile.findAll({
    where: { attachment_id: attachmentId },
    include: [
      {
        model: PrescriptionPharmacyForward,
        as: "forward",
        attributes: ["pharmacy_id"],
        required: true,
      },
    ],
    limit: 10,
  });
  if (!rows.length) return false;
  for (const row of rows) {
    const pharmacyId = row.forward?.pharmacy_id;
    if (!pharmacyId) continue;
    const link = await PharmacyUserProfile.findOne({
      where: { user_id: userId, pharmacy_id: pharmacyId, is_active: true },
    });
    if (link) return true;
  }
  return false;
}

/**
 * Resolve whether `user` may access `attachment` for the given action (read|delete).
 * Throws 404 (notFound) when unauthorized so existence is not leaked.
 */
async function assertCanAccessAttachment(user, attachment, action = "read") {
  if (!user?.user_id) throw deny(401, "Authentication required");
  if (!attachment) throw notFound();

  const userId = user.user_id;
  const accountType = user.account_type;

  if (await userHasPermission(userId, "attachments", "manage")) {
    return attachment;
  }

  if (action === "delete") {
    const canDelete =
      (await hasAttachmentPerm(userId, "delete")) ||
      attachment.uploaded_by === userId;
    if (!canDelete) throw notFound();
  } else if (!(await hasAttachmentPerm(userId, "read"))) {
    // Allow read without explicit perm when ownership clearly matches (portal / uploader)
    const isOwner = attachment.uploaded_by === userId;
    const isPatientSelf =
      accountType === ACCOUNT_TYPES.PATIENT &&
      attachment.patient_id &&
      attachment.patient_id === userId;
    if (!isOwner && !isPatientSelf) {
      // Still allow via clinical/pharmacy ownership below — but need at least one path
    }
  }

  // Uploader always has access to their own files
  if (attachment.uploaded_by === userId) {
    return attachment;
  }

  // Patient portal: only own patient-scoped files
  if (accountType === ACCOUNT_TYPES.PATIENT) {
    if (attachment.patient_id === userId) return attachment;
    throw notFound();
  }

  // Pharmacy: only pharmacy-forward related files
  if (accountType === ACCOUNT_TYPES.PHARMACY) {
    if (attachment.resource_type === RESOURCE_TYPES.PHARMACY_FORWARD) {
      if (await resolvePharmacyForwardAccess(userId, attachment.resource_id)) {
        return attachment;
      }
    }
    if (await attachmentLinkedToPharmacyUser(attachment.attachment_id, userId)) {
      return attachment;
    }
    throw notFound();
  }

  // Internal staff — cashers without clinical/attachment perms cannot reach clinical files
  if (accountType === ACCOUNT_TYPES.INTERNAL) {
    // Explicit patient scope: staff with patients:read may access patient-linked files
    if (
      attachment.resource_type === RESOURCE_TYPES.PATIENT &&
      attachment.patient_id
    ) {
      if (await userHasPermission(userId, "patients", "read")) {
        return attachment;
      }
    }

    // Appointment-scoped
    if (
      attachment.resource_type === RESOURCE_TYPES.APPOINTMENT &&
      attachment.resource_id
    ) {
      try {
        const { canAccessAppointment } = require("./medicalWorkflowService");
        await canAccessAppointment(attachment.resource_id, userId);
        return attachment;
      } catch {
        throw notFound();
      }
    }

    // User profile (signatures etc.)
    if (
      attachment.resource_type === RESOURCE_TYPES.USER_PROFILE &&
      attachment.resource_id === userId
    ) {
      return attachment;
    }

    // Legacy orphan: discover via workflow logs
    const appointmentIds = await resolveLinkedAppointmentIds(
      attachment.attachment_id
    );
    if (appointmentIds.length) {
      const { canAccessAppointment } = require("./medicalWorkflowService");
      for (const apptId of appointmentIds) {
        try {
          await canAccessAppointment(apptId, userId);
          return attachment;
        } catch {
          // try next
        }
      }
    }

    // Pharmacy forward junction (internal staff managing pharmacy)
    if (await attachmentLinkedToPharmacyUser(attachment.attachment_id, userId)) {
      return attachment;
    }

    // Explicit read permission + patient_id on file (e.g. registry uploads)
    if (
      attachment.patient_id &&
      (await userHasPermission(userId, "patients", "read"))
    ) {
      return attachment;
    }
  }

  throw notFound();
}

async function listAccessibleAttachments(user, { limit = 50, offset = 0 } = {}) {
  if (!user?.user_id) throw deny(401, "Authentication required");

  const userId = user.user_id;
  const accountType = user.account_type;

  if (await userHasPermission(userId, "attachments", "manage")) {
    const rows = await Attachment.findAll({
      order: [["created_at", "DESC"]],
      limit: Math.min(Number(limit) || 50, 100),
      offset: Number(offset) || 0,
      attributes: [
        "attachment_id",
        "file_name",
        "uploaded_by",
        "created_at",
        "resource_type",
        "resource_id",
        "patient_id",
      ],
    });
    return rows;
  }

  const orClauses = [{ uploaded_by: userId }];

  if (accountType === ACCOUNT_TYPES.PATIENT) {
    orClauses.push({ patient_id: userId });
  } else if (accountType === ACCOUNT_TYPES.PHARMACY) {
    const pharmacyIds = (
      await PharmacyUserProfile.findAll({
        where: { user_id: userId, is_active: true },
        attributes: ["pharmacy_id"],
      })
    ).map((p) => p.pharmacy_id);
    if (pharmacyIds.length) {
      const forwards = await PrescriptionPharmacyForward.findAll({
        where: { pharmacy_id: { [Op.in]: pharmacyIds } },
        attributes: ["forward_id"],
      });
      const forwardIds = forwards.map((f) => f.forward_id);
      if (forwardIds.length) {
        orClauses.push({
          resource_type: RESOURCE_TYPES.PHARMACY_FORWARD,
          resource_id: { [Op.in]: forwardIds },
        });
      }
    }
  } else {
    // Internal: own uploads + patient-scoped if they can read patients
    if (await userHasPermission(userId, "patients", "read")) {
      orClauses.push({ resource_type: RESOURCE_TYPES.PATIENT });
      orClauses.push({ patient_id: { [Op.ne]: null } });
    }
    orClauses.push({
      resource_type: RESOURCE_TYPES.USER_PROFILE,
      resource_id: userId,
    });
  }

  return Attachment.findAll({
    where: { [Op.or]: orClauses },
    order: [["created_at", "DESC"]],
    limit: Math.min(Number(limit) || 50, 100),
    offset: Number(offset) || 0,
    attributes: [
      "attachment_id",
      "file_name",
      "uploaded_by",
      "created_at",
      "resource_type",
      "resource_id",
      "patient_id",
    ],
  });
}

/**
 * Backfill / set resource linkage (idempotent). Used by workflow & pharmacy.
 */
async function linkAttachmentsToResource(
  attachmentIds,
  { resourceType, resourceId, patientId } = {}
) {
  const ids = (attachmentIds || []).filter(Boolean);
  if (!ids.length || !resourceType) return;

  await Attachment.update(
    {
      resource_type: resourceType,
      resource_id: resourceId || null,
      ...(patientId ? { patient_id: patientId } : {}),
    },
    {
      where: {
        attachment_id: { [Op.in]: ids },
        [Op.or]: [
          { resource_type: null },
          { resource_type: RESOURCE_TYPES.GENERIC },
          { resource_id: null },
        ],
      },
    }
  );
}

function parseUploadContext(body = {}) {
  const resourceType = body.resource_type
    ? String(body.resource_type).trim().toLowerCase()
    : null;
  const resourceId = body.resource_id || null;
  const patientId = body.patient_id || null;
  const allowed = new Set(Object.values(RESOURCE_TYPES));
  return {
    resource_type:
      resourceType && allowed.has(resourceType)
        ? resourceType
        : RESOURCE_TYPES.GENERIC,
    resource_id: resourceId || null,
    patient_id: patientId || null,
  };
}

module.exports = {
  RESOURCE_TYPES,
  canUpload,
  hasAttachmentPerm,
  assertCanAccessAttachment,
  listAccessibleAttachments,
  linkAttachmentsToResource,
  parseUploadContext,
  notFound,
  deny,
};
