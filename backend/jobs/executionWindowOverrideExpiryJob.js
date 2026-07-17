"use strict";

const {
  expireDueExecutionWindowOverrides,
} = require("../services/planAmendment/executionWindowReopeningDomain");

let scheduledTask = null;

function startExecutionWindowOverrideExpiryJob() {
  if (scheduledTask) {
    return scheduledTask;
  }

  let cron;
  try {
    cron = require("node-cron");
  } catch (error) {
    console.warn(
      "Execution window override expiry job skipped: node-cron unavailable.",
      error.message
    );
    return null;
  }

  scheduledTask = cron.schedule("*/5 * * * *", async () => {
    try {
      const count = await expireDueExecutionWindowOverrides();
      if (count > 0) {
        console.log(`Expired ${count} execution window override(s).`);
      }
    } catch (error) {
      console.error("Execution window override expiry job failed:", error.message);
    }
  });

  return scheduledTask;
}

module.exports = {
  startExecutionWindowOverrideExpiryJob,
};
