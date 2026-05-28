"use strict";

const scheduleService = require("../../services/patientScheduleService");
const { formatDateOnly, addDaysToDate } = require("../../utils/scheduleSlots");

const getConfig = async (req, res) => {
  try {
    const data = await scheduleService.getSettings();
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const updateConfig = async (req, res) => {
  try {
    const data = await scheduleService.updateSettings(req.body, req.user.user_id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const getEligibleStaff = async (req, res) => {
  try {
    const staff = await scheduleService.getEligibleStaff();
    return res.json({
      success: true,
      data: staff.map((u) => u.get({ plain: true })),
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const listSchedules = async (req, res) => {
  try {
    const { staff_id, from, to, patient_id, status } = req.query;
    const rows = await scheduleService.listSchedules({
      staff_id,
      from,
      to,
      patient_id,
      status,
    });
    return res.json({
      success: true,
      data: rows.map((r) => r.get({ plain: true })),
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const getMatrix = async (req, res) => {
  try {
    const { staff_id, from, to } = req.query;
    if (!staff_id) {
      return res.status(400).json({ success: false, message: "staff_id is required" });
    }

    const settings = await scheduleService.getSettings();
    const fromDate = from || formatDateOnly(new Date());
    const toDate =
      to || addDaysToDate(fromDate, Math.min(6, Number(req.query.days) || 6));

    const meta = scheduleService.buildMatrixMeta(fromDate, toDate, settings);
    const schedules = await scheduleService.listSchedules({
      staff_id,
      from: fromDate,
      to: toDate,
    });

    return res.json({
      success: true,
      data: {
        ...meta,
        schedules: schedules.map((s) => s.get({ plain: true })),
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const createSchedule = async (req, res) => {
  try {
    const row = await scheduleService.createSchedule(req.body, req.user.user_id);
    return res.status(201).json({ success: true, data: row });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const updateSchedule = async (req, res) => {
  try {
    const row = await scheduleService.updateSchedule(
      req.params.id,
      req.body,
      req.user.user_id
    );
    return res.json({ success: true, data: row });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const shiftSchedules = async (req, res) => {
  try {
    const result = await scheduleService.shiftSchedules(req.body);
    return res.json({ success: true, data: result });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

module.exports = {
  getConfig,
  updateConfig,
  getEligibleStaff,
  listSchedules,
  getMatrix,
  createSchedule,
  updateSchedule,
  shiftSchedules,
};
