"use strict";

class PharmacyIntegrationAdapter {
  /**
   * Export internal prescription to FHIR R4 MedicationRequest resource JSON.
   */
  exportToFHIRMedicationRequest(prescriptionData) {
    if (!prescriptionData) return null;

    return {
      resourceType: "MedicationRequest",
      id: prescriptionData.prescription_id || prescriptionData.id,
      status: prescriptionData.status === "issued" ? "active" : "completed",
      intent: "order",
      subject: {
        reference: `Patient/${prescriptionData.patient_id}`,
      },
      authoredOn: prescriptionData.created_at || new Date().toISOString(),
      requester: {
        reference: `Practitioner/${prescriptionData.doctor_id || prescriptionData.prescriber_id}`,
      },
      dosageInstruction: (prescriptionData.items || []).map((item) => ({
        text: `${item.item_name || "Medication"} ${item.dosage || ""} - ${item.quantity || "1"} units`,
        timing: {
          code: { text: item.frequency || "Daily" },
        },
      })),
    };
  }

  /**
   * Export dispensing fulfillment to FHIR R4 MedicationDispense resource JSON.
   */
  exportToFHIRMedicationDispense(fulfillmentData) {
    if (!fulfillmentData) return null;

    return {
      resourceType: "MedicationDispense",
      id: fulfillmentData.id || fulfillmentData.fulfillment_id,
      status: fulfillmentData.fulfillment_status === "completed" ? "completed" : "in-progress",
      authorizingPrescription: [
        {
          reference: `MedicationRequest/${fulfillmentData.prescription_id}`,
        },
      ],
      quantity: {
        value: fulfillmentData.items_detail?.length || 1,
        unit: "pack",
      },
      whenHandedOver: fulfillmentData.dispensed_at || new Date().toISOString(),
    };
  }
}

module.exports = new PharmacyIntegrationAdapter();
