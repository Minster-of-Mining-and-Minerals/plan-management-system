"use strict";

const db = require("../../models");
const unifiedClinicalSLAEngine = require("./unifiedClinicalSLAEngine");

class ClinicalOperationsAnalyticsService {
  /**
   * Compute comprehensive clinical operations analytics across all domains.
   */
  async getClinicalOperationsAnalytics() {
    const orders = await db.ClinicalOrder.findAll();

    const ordersByDomain = {};
    const pendingWorkloadByDomain = {};
    const cancellationStatsByDomain = {};
    let totalBreaches = 0;
    let completedCount = 0;
    let totalCompletionDurationMins = 0;

    for (const order of orders) {
      const domain = (order.order_type || "LABORATORY").toUpperCase();
      const status = (order.status || order.order_status || "ordered").toUpperCase();

      // 1. Orders by domain
      ordersByDomain[domain] = (ordersByDomain[domain] || 0) + 1;

      // 2. Cancellation stats
      if (status === "CANCELLED") {
        cancellationStatsByDomain[domain] = (cancellationStatsByDomain[domain] || 0) + 1;
      } else if (status !== "COMPLETED" && status !== "VERIFIED") {
        // 3. Pending workload
        pendingWorkloadByDomain[domain] = (pendingWorkloadByDomain[domain] || 0) + 1;
      }

      // 4. SLA breaches
      const sla = unifiedClinicalSLAEngine.evaluateSLA(order.created_at, order.priority, domain);
      if (sla.status === "SLA_BREACHED") {
        totalBreaches++;
      }

      // 5. Completion time calculation
      if (status === "COMPLETED" || status === "VERIFIED") {
        completedCount++;
        const createdAt = new Date(order.created_at);
        const updatedAt = new Date(order.updated_at);
        const durationMins = Math.max(0, Math.round((updatedAt.getTime() - createdAt.getTime()) / (1000 * 60)));
        totalCompletionDurationMins += durationMins;
      }
    }

    const averageCompletionTimeMins = completedCount > 0 ? Math.round(totalCompletionDurationMins / completedCount) : 0;

    return {
      total_orders: orders.length,
      orders_by_domain: ordersByDomain,
      pending_workload_by_domain: pendingWorkloadByDomain,
      cancellation_stats_by_domain: cancellationStatsByDomain,
      total_sla_breaches: totalBreaches,
      average_completion_time_minutes: averageCompletionTimeMins,
      completed_orders_count: completedCount,
    };
  }

  /**
   * Live Hospital Dashboard KPIs
   */
  async getHospitalKPIs() {
    const orders = await db.ClinicalOrder.findAll();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let activeEncounters = 0;
    let todayAppointmentsCount = 0;
    let pendingFollowUpsCount = 0;

    // Safely check Appointments / Follow-ups if models exist
    if (db.Appointment) {
      try {
        todayAppointmentsCount = await db.Appointment.count({
          where: {
            created_at: { [db.Sequelize.Op.gte]: todayStart },
          },
        });
      } catch (e) {
        todayAppointmentsCount = 0;
      }
    }

    if (db.EncounterFollowUp) {
      try {
        pendingFollowUpsCount = await db.EncounterFollowUp.count({
          where: { status: "PENDING" },
        });
      } catch (e) {
        pendingFollowUpsCount = 0;
      }
    }

    const ordersByDomain = { LABORATORY: 0, RADIOLOGY: 0, PHARMACY: 0 };
    let activeOrders = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;
    let totalCompletionDurationMins = 0;
    let slaWarningCount = 0;
    let slaBreachCount = 0;
    let highPriorityCompletedCount = 0;
    let highPriorityTotal = 0;
    const activeProvidersSet = new Set();
    const highRiskPatientsSet = new Set();

    orders.forEach((o) => {
      const domain = (o.order_type || "LABORATORY").toUpperCase();
      ordersByDomain[domain] = (ordersByDomain[domain] || 0) + 1;

      const st = (o.status || o.order_status || "ORDERED").toUpperCase();
      const provider = o.assigned_to || o.assigned_staff_id || o.doctor_id;
      if (provider) activeProvidersSet.add(provider);

      if (o.priority === "STAT" || o.priority === "HIGH") {
        highPriorityTotal++;
        if (st === "COMPLETED" || st === "VERIFIED") highPriorityCompletedCount++;
        if (o.patient_id) highRiskPatientsSet.add(o.patient_id);
      }

      if (st === "CANCELLED") {
        cancelledOrders++;
      } else if (st === "COMPLETED" || st === "VERIFIED") {
        completedOrders++;
        const createdAt = new Date(o.created_at);
        const updatedAt = new Date(o.updated_at || o.created_at);
        totalCompletionDurationMins += Math.max(0, Math.round((updatedAt.getTime() - createdAt.getTime()) / (1000 * 60)));
      } else {
        activeOrders++;
        const elapsedMins = Math.round((now.getTime() - new Date(o.created_at).getTime()) / (1000 * 60));
        if (elapsedMins > 120) slaBreachCount++;
        else if (elapsedMins > 60) slaWarningCount++;
      }
    });

    const avgCompletionMins = completedOrders > 0 ? Math.round(totalCompletionDurationMins / completedOrders) : 0;
    const totalOrders = orders.length || 1;
    const slaCompliancePct = Math.round(((totalOrders - slaBreachCount) / totalOrders) * 100);
    const completionPct = Math.round((completedOrders / totalOrders) * 100);
    const cancellationPct = Math.round((cancelledOrders / totalOrders) * 100);
    const highPriorityCompletionPct = highPriorityTotal > 0 ? Math.round((highPriorityCompletedCount / highPriorityTotal) * 100) : 100;

    return {
      active_encounters: activeEncounters || activeOrders,
      waiting_patients: activeOrders,
      active_clinical_orders: activeOrders,
      completed_clinical_orders: completedOrders,
      cancelled_clinical_orders: cancelledOrders,
      orders_by_domain: ordersByDomain,
      average_completion_time_minutes: avgCompletionMins,
      active_providers_count: activeProvidersSet.size,
      todays_appointments: todayAppointmentsCount,
      todays_admissions: 0, // Future compatible
      pending_followups: pendingFollowUpsCount,
      high_risk_patients_count: highRiskPatientsSet.size,
      sla_warning_count: slaWarningCount,
      sla_breach_count: slaBreachCount,
      sla_compliance_percentage: slaCompliancePct,
      completion_percentage: completionPct,
      cancellation_percentage: cancellationPct,
      high_priority_completion_percentage: highPriorityCompletionPct,
      patient_throughput: completedOrders,
      clinical_orders_per_hour: Math.round(orders.length / 24) || 1,
      clinical_orders_per_day: orders.length,
    };
  }

  /**
   * Department Operations Dashboard KPIs
   */
  async getDepartmentKPIs(departmentId) {
    const orders = await db.ClinicalOrder.findAll({
      where: { order_type: departmentId },
    });
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let pendingQueue = 0;
    let completedToday = 0;
    let slaWarningCount = 0;
    let slaBreachCount = 0;
    let totalTurnaroundMins = 0;
    let totalCompleted = 0;
    const staffSet = new Set();

    orders.forEach((o) => {
      const st = (o.status || o.order_status || "ORDERED").toUpperCase();
      const staff = o.assigned_to || o.assigned_staff_id || o.doctor_id;
      if (staff) staffSet.add(staff);

      if (st === "COMPLETED" || st === "VERIFIED") {
        totalCompleted++;
        const createdAt = new Date(o.created_at);
        const updatedAt = new Date(o.updated_at || o.created_at);
        totalTurnaroundMins += Math.max(0, Math.round((updatedAt.getTime() - createdAt.getTime()) / (1000 * 60)));

        if (new Date(o.updated_at) >= todayStart) {
          completedToday++;
        }
      } else if (st !== "CANCELLED") {
        pendingQueue++;
        const elapsedMins = Math.round((now.getTime() - new Date(o.created_at).getTime()) / (1000 * 60));
        if (elapsedMins > 120) slaBreachCount++;
        else if (elapsedMins > 60) slaWarningCount++;
      }
    });

    const avgTurnaroundMins = totalCompleted > 0 ? Math.round(totalTurnaroundMins / totalCompleted) : 0;
    const staffUtilizationPct = Math.min(Math.round((pendingQueue / Math.max(staffSet.size, 1)) * 20), 100);

    return {
      department: departmentId,
      current_workload: pendingQueue,
      pending_queue: pendingQueue,
      completed_today: completedToday,
      average_turnaround_minutes: avgTurnaroundMins,
      sla_warning_count: slaWarningCount,
      sla_breach_count: slaBreachCount,
      staff_count: staffSet.size,
      current_staff_utilization_pct: staffUtilizationPct,
    };
  }

  /**
   * Hospital Workload Distribution & Provider Workload
   */
  async getProviderWorkload(providerId) {
    const orders = await db.ClinicalOrder.findAll({
      where: {
        [db.Sequelize.Op.or]: [
          { assigned_staff_id: providerId },
          { ordered_by: providerId },
        ],
      },
    });

    let pendingCount = 0;
    let completedCount = 0;
    let statCount = 0;

    orders.forEach((o) => {
      const st = (o.status || o.order_status || "ORDERED").toUpperCase();
      if (o.priority === "STAT") statCount++;

      if (st === "COMPLETED" || st === "VERIFIED") {
        completedCount++;
      } else if (st !== "CANCELLED") {
        pendingCount++;
      }
    });

    return {
      provider_id: providerId,
      total_assigned_orders: orders.length,
      pending_workload: pendingCount,
      completed_workload: completedCount,
      stat_workload: statCount,
      capacity_status: pendingCount > 10 ? "OVERLOADED" : pendingCount > 5 ? "HIGH" : "NORMAL",
    };
  }

  /**
   * Executive Summary API
   */
  async getExecutiveSummary() {
    const hospitalKPIs = await this.getHospitalKPIs();
    const labKPIs = await this.getDepartmentKPIs("LABORATORY");
    const radKPIs = await this.getDepartmentKPIs("RADIOLOGY");
    const pharmKPIs = await this.getDepartmentKPIs("PHARMACY");

    // Compute operational score (1-100)
    let score = 100;
    if (hospitalKPIs.sla_breach_count > 0) score -= hospitalKPIs.sla_breach_count * 5;
    if (hospitalKPIs.sla_warning_count > 0) score -= hospitalKPIs.sla_warning_count * 2;
    score = Math.max(score, 0);

    return {
      hospital_overview: {
        active_encounters: hospitalKPIs.active_encounters,
        total_active_orders: hospitalKPIs.active_clinical_orders,
        todays_completed_orders: hospitalKPIs.completed_clinical_orders,
        high_risk_patients: hospitalKPIs.high_risk_patients_count,
      },
      todays_workload: {
        total_orders: hospitalKPIs.clinical_orders_per_day,
        orders_per_hour: hospitalKPIs.clinical_orders_per_hour,
        throughput: hospitalKPIs.patient_throughput,
      },
      critical_alerts: {
        sla_breaches: hospitalKPIs.sla_breach_count,
        sla_warnings: hospitalKPIs.sla_warning_count,
        stat_orders_pending: hospitalKPIs.high_risk_patients_count,
      },
      sla_health: {
        sla_compliance_percentage: hospitalKPIs.sla_compliance_percentage,
        average_completion_time_minutes: hospitalKPIs.average_completion_time_minutes,
      },
      department_ranking: [
        { department: "LABORATORY", workload: labKPIs.current_workload, sla_breaches: labKPIs.sla_breach_count },
        { department: "RADIOLOGY", workload: radKPIs.current_workload, sla_breaches: radKPIs.sla_breach_count },
        { department: "PHARMACY", workload: pharmKPIs.current_workload, sla_breaches: pharmKPIs.sla_breach_count },
      ],
      operational_score: score,
    };
  }
}

module.exports = new ClinicalOperationsAnalyticsService();
