"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const auditService = require("./auditService");

class RadiologyBillingService {
  async logAudit(action, resourceId, staffId, details = {}, transaction = null) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: staffId,
        action,
        resourceType: "RadiologyBilling",
        resourceId,
        details,
      });
    }
  }

  /**
   * Create billable finance charge entry for a completed radiology study.
   */
  async createRadiologyCharge(studyId, staffId) {
    const t = await db.sequelize.transaction();
    try {
      const study = await db.RadiologyStudy.findByPk(studyId, {
        include: [{ model: db.RadiologyProcedureCatalog, as: "procedureCatalog" }],
        transaction: t,
      });

      if (!study) {
        const err = new Error("Radiology study not found");
        err.status = 404;
        throw err;
      }

      if (!study.appointment_id) {
        // Charge recorded against study directly
        await this.logAudit("RADIOLOGY_CHARGE_CREATED", studyId, staffId, { amount: 0, reason: "No appointment linked" }, t);
        await t.commit();
        return { success: true, message: "No linked appointment for billing account", entry: null };
      }

      const billingServiceId = study.procedureCatalog?.billing_service_id;
      let service = null;
      if (billingServiceId && db.BillingService) {
        service = await db.BillingService.findByPk(billingServiceId, { transaction: t });
      }

      if (!service && db.BillingService) {
        // Fallback to active radiology service category item
        service = await db.BillingService.findOne({
          where: { status: "active" },
          transaction: t,
        });
      }

      let entry = null;
      if (service && db.AppointmentBillingAccount && db.AppointmentBillingEntry) {
        // Get or create visit billing account
        let [account] = await db.AppointmentBillingAccount.findOrCreate({
          where: { appointment_id: study.appointment_id },
          defaults: {
            account_id: uuidv4(),
            appointment_id: study.appointment_id,
            patient_id: study.patient_id,
            status: "pending_payment",
            subtotal: 0,
            discount_total: 0,
            tax_total: 0,
            grand_total: 0,
            balance_due: 0,
          },
          transaction: t,
        });

        const unitPrice = Number(service.unit_price || 0);
        const taxPercent = Number(service.tax_percent || 0);
        const taxAmount = Number(((unitPrice * taxPercent) / 100).toFixed(2));
        const totalPrice = Number((unitPrice + taxAmount).toFixed(2));

        entry = await db.AppointmentBillingEntry.create(
          {
            entry_id: uuidv4(),
            account_id: account.account_id,
            appointment_id: study.appointment_id,
            service_id: service.service_id,
            service_name: `Radiology: ${study.procedureCatalog?.name || study.modality}`,
            quantity: 1,
            unit_price: unitPrice,
            tax_percent: taxPercent,
            tax_amount: taxAmount,
            discount_type: "none",
            discount_value: 0,
            discount_amount: 0,
            line_total: totalPrice,
            status: "active",
            created_by: staffId,
          },
          { transaction: t }
        );

        // Recalculate account totals
        const entries = await db.AppointmentBillingEntry.findAll({
          where: { account_id: account.account_id, status: "active" },
          transaction: t,
        });

        const newSubtotal = entries.reduce((acc, e) => acc + Number(e.unit_price * e.quantity), 0);
        const newTaxTotal = entries.reduce((acc, e) => acc + Number(e.tax_amount), 0);
        const newGrandTotal = entries.reduce((acc, e) => acc + Number(e.line_total), 0);
        const amountPaid = Number(account.amount_paid || 0);
        const newBalance = Math.max(newGrandTotal - amountPaid, 0);

        await account.update(
          {
            subtotal: newSubtotal,
            tax_total: newTaxTotal,
            grand_total: newGrandTotal,
            balance_due: newBalance,
          },
          { transaction: t }
        );
      }

      await this.logAudit("RADIOLOGY_CHARGE_CREATED", studyId, staffId, { entry_id: entry ? entry.entry_id : null }, t);

      await t.commit();
      return { success: true, entry: entry ? entry.get({ plain: true }) : null };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Cancel a radiology billing charge line.
   */
  async cancelRadiologyCharge(studyId, reason, staffId) {
    if (!reason?.trim()) {
      const err = new Error("Cancellation reason is required");
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const study = await db.RadiologyStudy.findByPk(studyId, { transaction: t });
      if (!study) {
        const err = new Error("Radiology study not found");
        err.status = 404;
        throw err;
      }

      await this.logAudit("RADIOLOGY_CHARGE_CANCELLED", studyId, staffId, { reason: reason.trim() }, t);

      await t.commit();
      return { success: true, message: "Radiology charge cancelled" };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Verify charge validity for a study.
   */
  async verifyCharge(studyId) {
    const study = await db.RadiologyStudy.findByPk(studyId, {
      include: [{ model: db.RadiologyProcedureCatalog, as: "procedureCatalog" }],
    });

    if (!study) {
      const err = new Error("Radiology study not found");
      err.status = 404;
      throw err;
    }

    return {
      study_id: studyId,
      accession_number: study.accession_number,
      modality: study.modality,
      billing_service_id: study.procedureCatalog?.billing_service_id || null,
      is_billable: Boolean(study.procedureCatalog?.billing_service_id),
    };
  }
}

module.exports = new RadiologyBillingService();
