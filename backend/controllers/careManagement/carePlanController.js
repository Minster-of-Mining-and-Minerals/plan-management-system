"use strict";

const carePlanService = require("../../services/carePlanService");

const getCarePlan = async (req, res) => {
  try {
    const carePlan = await carePlanService.getCarePlan(req.params.appointmentId);
    return res.json({ success: true, data: carePlan });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const upsertCarePlan = async (req, res) => {
  try {
    const carePlan = await carePlanService.upsertCarePlan(
      req.params.appointmentId,
      req.body,
      req.user.user_id
    );
    return res.json({ success: true, data: carePlan });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

module.exports = {
  getCarePlan,
  upsertCarePlan,
};
