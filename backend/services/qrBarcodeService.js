"use strict";

function buildQrPayload(patientCode, userId) {
  return JSON.stringify({
    type: "novacure_patient",
    patient_code: patientCode,
    user_id: userId,
    generated_at: new Date().toISOString(),
  });
}

function buildBarcodeValue(patientCode) {
  return patientCode.replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

function assignPatientCodes(patientCode, userId) {
  return {
    qr_code: buildQrPayload(patientCode, userId),
    barcode: buildBarcodeValue(patientCode),
  };
}

module.exports = {
  buildQrPayload,
  buildBarcodeValue,
  assignPatientCodes,
};
