"use strict";

const { roundMoney } = require("./billingPricing");

function deriveAccountStatus({
  entry_count,
  amount_paid,
  grand_total,
  current_status,
}) {
  if (["cancelled", "refunded"].includes(current_status)) {
    return current_status;
  }

  if (!entry_count) {
    return "draft";
  }

  const paid = roundMoney(amount_paid);
  const total = roundMoney(grand_total);
  const balance = roundMoney(Math.max(total - paid, 0));

  if (balance <= 0 && paid > 0) {
    return "paid";
  }
  if (paid > 0 && balance > 0) {
    return "partially_paid";
  }
  return "pending_payment";
}

function accountHasPayments(account) {
  return roundMoney(account?.amount_paid || 0) > 0;
}

function accountIsLockedForCharges(account) {
  const status = account?.status;
  return (
    accountHasPayments(account) ||
    status === "partially_paid" ||
    status === "paid" ||
    status === "cancelled" ||
    status === "refunded"
  );
}

module.exports = {
  deriveAccountStatus,
  accountHasPayments,
  accountIsLockedForCharges,
};
