"use strict";

const db = require("../../models");

class ClinicalOperationsFeedService {
  /**
   * Get real-time operational feed items, sorted newest first.
   */
  async getOperationsFeed(limit = 20) {
    const feed = [];
    const now = new Date();

    // 1. Fetch recent timeline events
    if (db.TimelineEvent) {
      try {
        const events = await db.TimelineEvent.findAll({
          limit,
          order: [["created_at", "DESC"]],
        });

        events.forEach((evt) => {
          const plain = evt.get({ plain: true });
          feed.push({
            id: `evt-${plain.event_id || plain.id}`,
            event_type: plain.event_type || "TIMELINE_EVENT",
            title: plain.title || plain.event_type,
            description: plain.description || plain.notes || "",
            domain: plain.domain || "CLINICAL",
            timestamp: plain.created_at || plain.timestamp,
            severity: plain.event_type?.includes("BREACH") ? "HIGH" : plain.event_type?.includes("WARNING") ? "MEDIUM" : "INFO",
          });
        });
      } catch (e) {
        // Fallback gracefully
      }
    }

    // 2. Fetch recent ClinicalOrders to generate feed events if feed is small
    const orders = await db.ClinicalOrder.findAll({
      limit: Math.max(limit - feed.length, 10),
      order: [["updated_at", "DESC"]],
    });

    orders.forEach((o) => {
      const plain = o.get({ plain: true });
      const domain = (plain.order_type || "LABORATORY").toUpperCase();
      const status = (plain.status || plain.order_status || "ORDERED").toUpperCase();
      const elapsedMins = Math.round((now.getTime() - new Date(plain.created_at).getTime()) / (1000 * 60));

      if (status === "COMPLETED" || status === "VERIFIED") {
        feed.push({
          id: `order-comp-${plain.clinical_order_id || plain.id}`,
          event_type: `${domain}_COMPLETED`,
          title: `${domain} Order Completed`,
          description: `Order #${(plain.clinical_order_id || "").substring(0, 8)} completed`,
          domain,
          timestamp: plain.updated_at,
          severity: "INFO",
        });
      } else if (elapsedMins > 120) {
        feed.push({
          id: `order-sla-${plain.clinical_order_id || plain.id}`,
          event_type: "SLA_BREACH",
          title: `SLA Breach: ${domain}`,
          description: `Order pending for ${elapsedMins} mins`,
          domain,
          timestamp: plain.updated_at,
          severity: "HIGH",
        });
      } else {
        feed.push({
          id: `order-wait-${plain.clinical_order_id || plain.id}`,
          event_type: "PATIENT_WAITING",
          title: `Patient Waiting for ${domain}`,
          description: `Order pending (${plain.priority || "ROUTINE"})`,
          domain,
          timestamp: plain.created_at,
          severity: plain.priority === "STAT" ? "HIGH" : "INFO",
        });
      }
    });

    // Sort newest first & limit
    return feed
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}

module.exports = new ClinicalOperationsFeedService();
