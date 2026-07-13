"use strict";

const db = require("../models");
const { userHasPermission } = require("./userPermissionService");

const { AppointmentBillingAccount, User } = db;

/** Explicit Take patient hold duration (minutes). */
const SERVING_CLAIM_TTL_MINUTES = 10;

function claimExpiryDate(from = new Date()) {
  return new Date(from.getTime() + SERVING_CLAIM_TTL_MINUTES * 60 * 1000);
}

function isClaimActive(account, now = new Date()) {
  if (!account?.serving_by) return false;
  if (!account.serving_expires_at) return false;
  return new Date(account.serving_expires_at).getTime() > now.getTime();
}

function formatServingClaim(accountPlain, viewerUserId = null) {
  if (!isClaimActive(accountPlain)) {
    return null;
  }
  return {
    serving_by: accountPlain.serving_by,
    serving_by_name:
      accountPlain.servingCashier?.full_name ||
      accountPlain.serving_by_name ||
      null,
    serving_claimed_at: accountPlain.serving_claimed_at,
    serving_expires_at: accountPlain.serving_expires_at,
    is_mine: Boolean(
      viewerUserId && accountPlain.serving_by === viewerUserId
    ),
  };
}

async function clearExpiredClaim(account, transaction) {
  if (!account.serving_by) return account;
  const plain = account.get ? account.get({ plain: true }) : account;
  if (isClaimActive(plain)) {
    return account;
  }
  await account.update(
    {
      serving_by: null,
      serving_claimed_at: null,
      serving_expires_at: null,
    },
    { transaction }
  );
  return account;
}

async function takeAccount(accountId, actor) {
  const t = await db.sequelize.transaction();
  try {
    const account = await AppointmentBillingAccount.findByPk(accountId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
      include: [
        {
          model: User,
          as: "servingCashier",
          attributes: ["user_id", "full_name"],
          required: false,
        },
      ],
    });

    if (!account) {
      const err = new Error("Billing account not found");
      err.status = 404;
      throw err;
    }

    await clearExpiredClaim(account, t);
    await account.reload({
      transaction: t,
      include: [
        {
          model: User,
          as: "servingCashier",
          attributes: ["user_id", "full_name"],
          required: false,
        },
      ],
    });

    const plain = account.get({ plain: true });
    if (isClaimActive(plain) && plain.serving_by !== actor.user_id) {
      const err = new Error(
        `This patient is being served by ${
          plain.servingCashier?.full_name || "another cashier"
        }`
      );
      err.status = 409;
      throw err;
    }

    const now = new Date();
    await account.update(
      {
        serving_by: actor.user_id,
        serving_claimed_at: now,
        serving_expires_at: claimExpiryDate(now),
      },
      { transaction: t }
    );

    await t.commit();

    const refreshed = await AppointmentBillingAccount.findByPk(accountId, {
      include: [
        {
          model: User,
          as: "servingCashier",
          attributes: ["user_id", "full_name"],
          required: false,
        },
      ],
    });

    return formatServingClaim(refreshed.get({ plain: true }), actor.user_id);
  } catch (error) {
    if (!t.finished) await t.rollback();
    throw error;
  }
}

async function releaseAccount(accountId, actor, { force = false } = {}) {
  const t = await db.sequelize.transaction();
  try {
    const account = await AppointmentBillingAccount.findByPk(accountId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!account) {
      const err = new Error("Billing account not found");
      err.status = 404;
      throw err;
    }

    await clearExpiredClaim(account, t);

    if (!account.serving_by) {
      await t.commit();
      return { released: true };
    }

    const isOwner = account.serving_by === actor.user_id;
    if (!isOwner && !force) {
      const err = new Error("Only the serving cashier can release this patient");
      err.status = 403;
      throw err;
    }

    if (force && !isOwner) {
      const canForce = await userHasPermission(
        actor.user_id,
        "finance_collections",
        "view"
      );
      if (!canForce) {
        const err = new Error("You do not have permission to force-release");
        err.status = 403;
        throw err;
      }
    }

    await account.update(
      {
        serving_by: null,
        serving_claimed_at: null,
        serving_expires_at: null,
      },
      { transaction: t }
    );

    await t.commit();
    return { released: true };
  } catch (error) {
    if (!t.finished) await t.rollback();
    throw error;
  }
}

async function releaseAllForCashier(cashierUserId, transaction) {
  await AppointmentBillingAccount.update(
    {
      serving_by: null,
      serving_claimed_at: null,
      serving_expires_at: null,
    },
    {
      where: { serving_by: cashierUserId },
      transaction,
    }
  );
}

async function assertCanCollect(accountId, actorUserId, transaction) {
  const account = await AppointmentBillingAccount.findByPk(accountId, {
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
    include: [
      {
        model: User,
        as: "servingCashier",
        attributes: ["user_id", "full_name"],
        required: false,
      },
    ],
  });

  if (!account) {
    const err = new Error("Billing account not found");
    err.status = 404;
    throw err;
  }

  await clearExpiredClaim(account, transaction);
  await account.reload({
    transaction,
    include: [
      {
        model: User,
        as: "servingCashier",
        attributes: ["user_id", "full_name"],
        required: false,
      },
    ],
  });

  const plain = account.get({ plain: true });

  if (!isClaimActive(plain) || plain.serving_by !== actorUserId) {
    const err = new Error(
      isClaimActive(plain)
        ? `This patient is being served by ${
            plain.servingCashier?.full_name || "another cashier"
          }. Ask them to release, or wait until the claim expires.`
        : "Take this patient first before collecting payment"
    );
    err.status = 409;
    throw err;
  }

  return account;
}

module.exports = {
  SERVING_CLAIM_TTL_MINUTES,
  isClaimActive,
  formatServingClaim,
  takeAccount,
  releaseAccount,
  releaseAllForCashier,
  assertCanCollect,
  clearExpiredClaim,
  claimExpiryDate,
};
