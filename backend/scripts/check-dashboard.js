"use strict";

const { getPlanExecutionDashboard } = require("../services/planExecutionDashboardService");

async function check() {
  try {
    const mockReq = {
      user: {
        user_id: "00000000-0000-0000-0000-000000000001",
        roles: ["Super Admin"],
        permissions: ["PLAN:VIEW_FULL_PLAN_HIERARCHY", "PLAN:READ_ALL"],
      },
    };

    const data = await getPlanExecutionDashboard(mockReq, {});
    console.log("=== PLAN EXECUTION DASHBOARD SUMMARY ===");
    console.log("Total Plans:", data.kpi?.totalPlans);
    console.log("Active Plans:", data.kpi?.activePlans);
    console.log("Completed Plans:", data.kpi?.completedPlans);
    console.log("In Execution Plans:", data.kpi?.inExecutionPlans);
    console.log("Average Progress:", data.kpi?.averageProgress + "%");
    console.log("Plans List Count:", data.plans?.length);
    if (data.plans?.length) {
      data.plans.forEach((p) => {
        console.log(`- ${p.draft_name}: status=${p.status}, progress=${p.execution_progress_percent}%, dashboard_status=${p.dashboard_status}`);
      });
    }
    process.exit(0);
  } catch (err) {
    console.error("Dashboard check error:", err);
    process.exit(1);
  }
}

check();
