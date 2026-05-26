"use strict";

const Joi = require("joi");

/** Email validation that allows non-IANA TLDs (e.g. @patient.demo.novacure). */
const joiEmail = Joi.string().email({ tlds: { allow: false } }).max(255);

module.exports = { joiEmail };
