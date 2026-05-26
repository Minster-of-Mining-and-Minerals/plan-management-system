"use strict";

const patientSlipConfigService = require("../../services/patientSlipConfigService");
const { RESERVED_FIELD_KEYS } = require("../../config/defaultPatientSlipConfig");

const getSlipConfiguration = async (_req, res) => {
  try {
    const data = await patientSlipConfigService.getSlipConfig();
    return res.status(200).json({
      success: true,
      data: {
        ...data,
        reserved_field_keys: RESERVED_FIELD_KEYS,
      },
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateSlipConfiguration = async (req, res) => {
  try {
    const slip_config = req.body?.slip_config ?? req.body;
    const data = await patientSlipConfigService.updateSlipConfig(
      slip_config,
      req.user?.user_id
    );
    return res.status(200).json({
      success: true,
      message: "Slip configuration updated",
      data,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getSlipConfiguration,
  updateSlipConfiguration,
};
