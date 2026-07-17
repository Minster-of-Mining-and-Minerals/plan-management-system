"use strict";

const { safeAddIndex, safeRemoveIndex } = require("./_helpers/migrationUtils");

/** Cashier payment list / today / history query support. */
module.exports = {
  async up(queryInterface) {
    await safeAddIndex(queryInterface, "cashier_payments", ["created_at"], {
      name: "cashier_payments_created_at_idx",
    });
    await safeAddIndex(
      queryInterface,
      "cashier_payments",
      ["received_by", "created_at"],
      { name: "cashier_payments_received_by_created_at_idx" }
    );
    await safeAddIndex(
      queryInterface,
      "cashier_payments",
      ["status", "created_at"],
      { name: "cashier_payments_status_created_at_idx" }
    );
  },

  async down(queryInterface) {
    await safeRemoveIndex(
      queryInterface,
      "cashier_payments",
      "cashier_payments_status_created_at_idx"
    );
    await safeRemoveIndex(
      queryInterface,
      "cashier_payments",
      "cashier_payments_received_by_created_at_idx"
    );
    await safeRemoveIndex(
      queryInterface,
      "cashier_payments",
      "cashier_payments_created_at_idx"
    );
  },
};
