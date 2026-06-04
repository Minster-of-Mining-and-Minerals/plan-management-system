"use strict";

const { Op } = require("sequelize");
const { SystemAuditLog, User } = require("../../models");
const { MODULE_LABELS } = require("../../services/auditLogService");

const getSystemAuditLogs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const offset = (page - 1) * limit;
    const { module, action, search } = req.query;

    const where = {};

    if (module) where.module = module;
    if (action) where.action = action;

    const include = [
      {
        model: User,
        as: "changedByUser",
        attributes: ["user_id", "full_name", "email"],
        required: false,
      },
    ];

    if (search) {
      where[Op.or] = [
        { summary: { [Op.iLike]: `%${search}%` } },
        { entity_label: { [Op.iLike]: `%${search}%` } },
        { module: { [Op.iLike]: `%${search}%` } },
        { "$changedByUser.full_name$": { [Op.iLike]: `%${search}%` } },
        { "$changedByUser.email$": { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await SystemAuditLog.findAndCountAll({
      where,
      include,
      order: [["created_at", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    const data = rows.map((row) => {
      const plain = row.get({ plain: true });
      return {
        ...plain,
        module_label: MODULE_LABELS[plain.module] || plain.module,
      };
    });

    return res.json({
      success: true,
      data,
      meta: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit) || 1,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getSystemAuditLogById = async (req, res) => {
  try {
    const log = await SystemAuditLog.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: "changedByUser",
          attributes: ["user_id", "full_name", "email"],
        },
      ],
    });

    if (!log) {
      return res.status(404).json({ success: false, message: "Audit log not found" });
    }

    const plain = log.get({ plain: true });

    return res.json({
      success: true,
      data: {
        ...plain,
        module_label: MODULE_LABELS[plain.module] || plain.module,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSystemAuditLogs,
  getSystemAuditLogById,
};
