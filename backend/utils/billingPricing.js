"use strict";

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function calculateUnitPricing(unitPrice, taxPercent) {
  const price = roundMoney(unitPrice);
  const tax = roundMoney(Number(taxPercent) || 0);
  const taxAmount = roundMoney(price * (tax / 100));
  const totalAmount = roundMoney(price + taxAmount);
  return {
    unit_price: price,
    tax_percent: tax,
    tax_amount: taxAmount,
    total_amount: totalAmount,
  };
}

function calculateLinePricing({
  unitPrice,
  taxPercent,
  quantity = 1,
  discountType = null,
  discountValue = 0,
}) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    const err = new Error("Quantity must be greater than zero");
    err.status = 400;
    throw err;
  }

  const unit = roundMoney(unitPrice);
  const tax = roundMoney(Number(taxPercent) || 0);
  const lineSubtotal = roundMoney(unit * qty);
  let discountAmount = 0;

  if (discountType === "percentage") {
    discountAmount = roundMoney(lineSubtotal * (Number(discountValue) / 100));
  } else if (discountType === "fixed") {
    discountAmount = roundMoney(Number(discountValue));
  }

  if (discountAmount > lineSubtotal) {
    discountAmount = lineSubtotal;
  }

  const taxableBase = roundMoney(lineSubtotal - discountAmount);
  const lineTaxAmount = roundMoney(taxableBase * (tax / 100));
  const lineTotal = roundMoney(taxableBase + lineTaxAmount);

  return {
    quantity: qty,
    unit_price: unit,
    tax_percent: tax,
    line_subtotal: lineSubtotal,
    discount_type: discountType,
    discount_value: discountValue ? roundMoney(discountValue) : null,
    discount_amount: discountAmount,
    line_tax_amount: lineTaxAmount,
    line_total: lineTotal,
  };
}

function summarizeLines(lines = []) {
  const active = lines.filter((line) => line.status !== "cancelled");
  const subtotal = roundMoney(
    active.reduce((sum, line) => sum + Number(line.line_subtotal || 0), 0)
  );
  const discountTotal = roundMoney(
    active.reduce((sum, line) => sum + Number(line.discount_amount || 0), 0)
  );
  const taxTotal = roundMoney(
    active.reduce((sum, line) => sum + Number(line.line_tax_amount || 0), 0)
  );
  const grandTotal = roundMoney(
    active.reduce((sum, line) => sum + Number(line.line_total || 0), 0)
  );

  return {
    subtotal,
    discount_total: discountTotal,
    tax_total: taxTotal,
    grand_total: grandTotal,
    entry_count: active.length,
  };
}

module.exports = {
  roundMoney,
  calculateUnitPricing,
  calculateLinePricing,
  summarizeLines,
};
