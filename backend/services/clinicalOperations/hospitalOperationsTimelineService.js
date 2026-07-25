"use strict";

const db = require("../../models");

class HospitalOperationsTimelineService {
  /**
   * Get hospital-wide operational timeline.
   */
  async getHospitalTimeline(limit = 30) {
    const timeline = [];
    const orders = await db.ClinicalOrder.findAll({
      limit,
      order: [["updated_at", "DESC"]],
    });

    const now = new Date();

    orders.forEach((o) => {
      const plain = o.get({ plain: true });
      const domain = (plain.order_type || "LABORATORY").toUpperCase();
      const status = (plain.status || plain.order_status || "ORDERED").toUpperCase();
      const priority = (plain.priority || "ROUTINE").toUpperCase();
      const elapsedMins = Math.round((now.getTime() - new Date(plain.created_at).getTime()) / (1000 * 60));

      let eventTitle = "";
      let category = "OPERATION";

      if (status === "COMPLETED" || status === "VERIFIED") {
        if (domain === "LABORATORY") eventTitle = "Critical Lab Completed";
        else if (domain === "RADIOLOGY") eventTitle = "STAT Radiology Report Verified";
        else if (domain === "PHARMACY") eventTitle = "Medication Dispensed";
        else eventTitle = `${domain} Order Completed`;
      } else if (elapsedMins > 120) {
        eventTitle = `SLA Breach: ${domain} Order Delayed`;
        category = "ALERT";
      } else if (priority === "STAT") {
        eventTitle = `STAT ${domain} Order Created`;
        category = "HIGH_PRIORITY";
      } else {
        eventTitle = `Clinical Order Registered (${domain})`;
      }

      timeline.push({
        id: `tl-${plain.clinical_order_id || plain.id}`,
        timestamp: plain.updated_at || plain.created_at,
        formatted_time: new Date(plain.updated_at || plain.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: eventTitle,
        domain,
        category,
        order_id: plain.clinical_order_id || plain.id,
        patient_id: plain.patient_id,
        status,
      });
    });

    return timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

module.exports = new HospitalOperationsTimelineService();
