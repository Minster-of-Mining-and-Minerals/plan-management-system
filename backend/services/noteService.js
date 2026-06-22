"use strict";

const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const {
  Note,
  NoteAttachment,
  Attachment,
  User,
  sequelize,
} = require("../models");
const { assertNotePermission } = require("../utils/notePermissionUtils");

const NOTE_INCLUDES = [
  {
    model: User,
    as: "createdByUser",
    attributes: ["user_id", "full_name", "email"],
  },
  {
    model: User,
    as: "updatedByUser",
    attributes: ["user_id", "full_name", "email"],
  },
  {
    model: Attachment,
    as: "attachments",
    through: { attributes: [] },
  },
];

function serializeNote(note) {
  const plain = note.get ? note.get({ plain: true }) : note;
  return {
    ...plain,
    attachments_count: plain.attachments?.length ?? 0,
  };
}

function ownershipError() {
  const error = new Error("Note not found.");
  error.status = 404;
  return error;
}

function assertNoteOwnership(note, userId) {
  if (!note || note.created_by !== userId) {
    throw ownershipError();
  }
}

async function syncNoteAttachments(noteId, attachmentIds = [], transaction) {
  const uniqueIds = [...new Set((attachmentIds || []).filter(Boolean))];
  await NoteAttachment.destroy({ where: { note_id: noteId }, transaction });

  if (!uniqueIds.length) return;

  const existing = await Attachment.findAll({
    where: { attachment_id: uniqueIds },
    transaction,
  });
  if (existing.length !== uniqueIds.length) {
    const error = new Error("One or more attachments were not found.");
    error.status = 400;
    throw error;
  }

  for (const attachmentId of uniqueIds) {
    await NoteAttachment.create(
      {
        note_attachment_id: uuidv4(),
        note_id: noteId,
        attachment_id: attachmentId,
      },
      { transaction }
    );
  }
}

async function resolvePinFields(userId, isPinned, { excludeNoteId } = {}) {
  if (!isPinned) {
    return { is_pinned: false, pin_order: null };
  }

  const where = {
    created_by: userId,
    is_pinned: true,
    pin_order: { [Op.ne]: null },
  };
  if (excludeNoteId) {
    where.note_id = { [Op.ne]: excludeNoteId };
  }

  const maxPinOrder = await Note.max("pin_order", { where });
  return {
    is_pinned: true,
    pin_order: (maxPinOrder ?? 0) + 1,
  };
}

async function listNotes(userId, query = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const offset = (page - 1) * limit;

  const where = { created_by: userId };

  if (query.title) {
    where.title = { [Op.iLike]: `%${query.title}%` };
  }
  if (query.search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${query.search}%` } },
      { content: { [Op.iLike]: `%${query.search}%` } },
    ];
  }
  if (query.is_pinned !== undefined) {
    where.is_pinned = query.is_pinned === true || query.is_pinned === "true";
  }
  if (query.date_from || query.date_to) {
    where.created_at = {};
    if (query.date_from) where.created_at[Op.gte] = new Date(query.date_from);
    if (query.date_to) {
      const end = new Date(query.date_to);
      end.setHours(23, 59, 59, 999);
      where.created_at[Op.lte] = end;
    }
  }

  const { count, rows } = await Note.findAndCountAll({
    where,
    include: NOTE_INCLUDES,
    order: [
      ["is_pinned", "DESC"],
      ["pin_order", "ASC NULLS LAST"],
      ["updated_at", "DESC"],
    ],
    limit,
    offset,
    distinct: true,
  });

  return {
    data: rows.map(serializeNote),
    meta: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit) || 1,
    },
  };
}

async function getNoteById(noteId, userId, { paranoid = true } = {}) {
  const note = await Note.findByPk(noteId, {
    include: NOTE_INCLUDES,
    paranoid,
  });
  if (!note) return null;

  const serialized = serializeNote(note);
  assertNoteOwnership(serialized, userId);
  return serialized;
}

async function createNote(payload, userId, permissions = []) {
  assertNotePermission(permissions, "create");

  const pinFields = await resolvePinFields(userId, Boolean(payload.is_pinned));

  const transaction = await sequelize.transaction();
  try {
    const note = await Note.create(
      {
        note_id: uuidv4(),
        title: payload.title,
        content: payload.content || "",
        status: "saved",
        is_pinned: pinFields.is_pinned,
        pin_order: pinFields.pin_order,
        is_archived: false,
        created_by: userId,
        updated_by: userId,
      },
      { transaction }
    );

    await syncNoteAttachments(note.note_id, payload.attachment_ids, transaction);
    await transaction.commit();

    return getNoteById(note.note_id, userId);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function updateNote(noteId, payload, userId, permissions = []) {
  assertNotePermission(permissions, "update");

  const note = await Note.findByPk(noteId);
  if (!note) {
    throw ownershipError();
  }
  assertNoteOwnership(note.get({ plain: true }), userId);

  const transaction = await sequelize.transaction();
  try {
    const updates = { updated_by: userId };

    if (payload.title !== undefined) updates.title = payload.title;
    if (payload.content !== undefined) updates.content = payload.content;

    if (payload.is_pinned !== undefined) {
      const pinFields = await resolvePinFields(userId, Boolean(payload.is_pinned), {
        excludeNoteId: noteId,
      });
      updates.is_pinned = pinFields.is_pinned;
      updates.pin_order = pinFields.pin_order;
    }

    await note.update(updates, { transaction });

    if (payload.attachment_ids !== undefined) {
      await syncNoteAttachments(noteId, payload.attachment_ids, transaction);
    }

    await transaction.commit();
    return getNoteById(noteId, userId);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function deleteNote(noteId, userId, permissions = []) {
  assertNotePermission(permissions, "delete");

  const note = await Note.findByPk(noteId);
  if (!note) {
    throw ownershipError();
  }
  assertNoteOwnership(note.get({ plain: true }), userId);

  await note.destroy();
  return note.get({ plain: true });
}

module.exports = {
  listNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
};
