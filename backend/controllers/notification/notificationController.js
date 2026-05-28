"use strict";

const notificationService = require("../../services/notificationService");

const listMine = async (req, res) => {
  try {
    const unreadOnly = req.query.unread === "true";
    const rows = await notificationService.listForUser(req.user.user_id, {
      unreadOnly,
    });
    return res.json({
      success: true,
      data: rows.map((r) => r.get({ plain: true })),
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const unreadCount = async (req, res) => {
  try {
    const count = await notificationService.unreadCount(req.user.user_id);
    return res.json({ success: true, data: { count } });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const markRead = async (req, res) => {
  try {
    const row = await notificationService.markRead(
      req.params.id,
      req.user.user_id
    );
    return res.json({ success: true, data: row.get({ plain: true }) });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const markAllRead = async (req, res) => {
  try {
    await notificationService.markAllRead(req.user.user_id);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = {
  listMine,
  unreadCount,
  markRead,
  markAllRead,
};
