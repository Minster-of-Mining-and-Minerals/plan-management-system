"use strict";

const { Op } = require("sequelize");
const db = require("../models");
const {
  UserSession,
  UserDeviceRestriction,
  IpRestriction,
  SessionSecurityLog,
  User,
} = db;
const {
  getClientIp,
  parseUserAgent,
  generateDeviceFingerprint,
  hashToken,
} = require("../utils/deviceDetector");
const { matchesIpRestriction } = require("../utils/ipUtils");

/**
 * Helper to emit real-time session revocation via Socket.IO
 */
function emitSocketRevocation(reqOrIo, targetUserId, sessionId, reason = "session_terminated") {
  try {
    const io =
      reqOrIo?.app?.get?.("socketio") ||
      reqOrIo?.app?.get?.("io") ||
      (typeof reqOrIo?.to === "function" ? reqOrIo : null);
    if (!io) return;

    io.emit("session_revoked", {
      userId: targetUserId,
      sessionId,
      reason,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Socket emission error (session_revoked):", err.message);
  }
}

/**
 * Log session security event
 */
async function logSecurityEvent({
  eventType,
  userId = null,
  actorId = null,
  sessionId = null,
  deviceFingerprintHash = null,
  ipAddress = null,
  userAgent = null,
  domain = "federal",
  organizationId = null,
  regionId = null,
  companyId = null,
  purchasingCenterId = null,
  details = null,
  transaction = null,
}) {
  try {
    return await SessionSecurityLog.create(
      {
        event_type: eventType,
        user_id: userId,
        actor_id: actorId,
        session_id: sessionId,
        device_fingerprint_hash: deviceFingerprintHash,
        ip_address: ipAddress,
        user_agent: userAgent,
        domain,
        organization_id: organizationId,
        region_id: regionId,
        company_id: companyId,
        purchasing_center_id: purchasingCenterId,
        details,
      },
      { transaction }
    );
  } catch (err) {
    console.error("Failed to write SessionSecurityLog:", err.message);
    return null;
  }
}

/**
 * Check if a client IP is restricted for the given user/scope
 */
async function checkIpRestriction(clientIp, { domain, organizationId, regionId, companyId, purchasingCenterId }) {
  if (!clientIp) return null;

  const now = new Date();
  const whereConditions = [
    { is_active: true },
    {
      [Op.or]: [
        { expires_at: null },
        { expires_at: { [Op.gt]: now } },
      ],
    },
  ];

  // Match active IP restrictions in user's domain/scope or global
  const scopeOr = [
    { domain: "global" },
    { domain: "federal", organization_id: null },
  ];

  if (regionId) {
    scopeOr.push({ domain: "regional", region_id: regionId });
    scopeOr.push({ domain: "regional", organization_id: regionId });
  }
  if (companyId) {
    scopeOr.push({ domain: "company", company_id: companyId });
    scopeOr.push({ domain: "company", organization_id: companyId });
  }
  if (purchasingCenterId) {
    scopeOr.push({ domain: "purchasing_center", purchasing_center_id: purchasingCenterId });
    scopeOr.push({ domain: "purchasing_center", organization_id: purchasingCenterId });
  }

  whereConditions.push({ [Op.or]: scopeOr });

  const restrictions = await IpRestriction.findAll({
    where: { [Op.and]: whereConditions },
  });

  for (const r of restrictions) {
    if (matchesIpRestriction(clientIp, r)) {
      return r;
    }
  }

  return null;
}

/**
 * Check if a device fingerprint is restricted for the given user/scope
 */
async function checkDeviceRestriction(deviceFingerprintHash, userId, { domain, organizationId, regionId, companyId, purchasingCenterId }) {
  if (!deviceFingerprintHash) return null;

  const now = new Date();
  const whereConditions = [
    { device_fingerprint_hash: deviceFingerprintHash },
    { is_active: true },
    {
      [Op.or]: [
        { expires_at: null },
        { expires_at: { [Op.gt]: now } },
      ],
    },
  ];

  // Match restriction for this specific user OR administrative device restriction for the scope
  const scopeOr = [
    { user_id: userId },
    { user_id: null, domain: "global" },
    { user_id: null, domain: "federal", organization_id: null },
  ];

  if (regionId) {
    scopeOr.push({ user_id: null, domain: "regional", region_id: regionId });
    scopeOr.push({ user_id: null, domain: "regional", organization_id: regionId });
  }
  if (companyId) {
    scopeOr.push({ user_id: null, domain: "company", company_id: companyId });
    scopeOr.push({ user_id: null, domain: "company", organization_id: companyId });
  }
  if (purchasingCenterId) {
    scopeOr.push({ user_id: null, domain: "purchasing_center", purchasing_center_id: purchasingCenterId });
    scopeOr.push({ user_id: null, domain: "purchasing_center", organization_id: purchasingCenterId });
  }

  whereConditions.push({ [Op.or]: scopeOr });

  return await UserDeviceRestriction.findOne({
    where: { [Op.and]: whereConditions },
  });
}

/**
 * Create a new user session on login
 */
async function createSession({ user, req, clientData = {} }) {
  const ipAddress = getClientIp(req);
  const userAgent = req.headers["user-agent"] || "";
  const { os, browser, browserVersion, deviceType, deviceName } = parseUserAgent(userAgent);
  const clientDeviceId = clientData.device_id || req.headers["x-device-id"] || null;
  const deviceFingerprintHash = generateDeviceFingerprint(req, clientDeviceId);

  const domain = user.purchasing_center_id
    ? "purchasing_center"
    : user.company_id
    ? "company"
    : user.region_id
    ? "regional"
    : "federal";

  const organizationId =
    user.purchasing_center_id ||
    user.company_id ||
    user.region_id ||
    user.government_structure_id ||
    null;

  const scopeData = {
    domain,
    organizationId,
    regionId: user.region_id || null,
    companyId: user.company_id || null,
    purchasingCenterId: user.purchasing_center_id || null,
  };

  // 1. Check IP restriction
  const ipRestricted = await checkIpRestriction(ipAddress, scopeData);
  if (ipRestricted) {
    await logSecurityEvent({
      eventType: "login_blocked_ip",
      userId: user.user_id,
      ipAddress,
      userAgent,
      deviceFingerprintHash,
      ...scopeData,
      details: {
        reason: ipRestricted.restriction_reason,
        restriction_id: ipRestricted.restriction_id,
      },
    });
    const err = new Error(`Access from IP address ${ipAddress} is restricted: ${ipRestricted.restriction_reason}`);
    err.code = "IP_RESTRICTED";
    err.status = 403;
    throw err;
  }

  // 2. Check Device restriction
  const deviceRestricted = await checkDeviceRestriction(deviceFingerprintHash, user.user_id, scopeData);
  if (deviceRestricted) {
    await logSecurityEvent({
      eventType: "login_blocked_device",
      userId: user.user_id,
      ipAddress,
      userAgent,
      deviceFingerprintHash,
      ...scopeData,
      details: {
        reason: deviceRestricted.restriction_reason,
        restriction_id: deviceRestricted.restriction_id,
      },
    });
    const err = new Error(`This device has been restricted from accessing the system: ${deviceRestricted.restriction_reason}`);
    err.code = "DEVICE_RESTRICTED";
    err.status = 403;
    throw err;
  }

  // 3. Create Session Record
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await UserSession.create({
    user_id: user.user_id,
    session_token_hash: "pending",
    device_fingerprint_hash: deviceFingerprintHash,
    device_name: clientData.device_name || deviceName,
    device_type: clientData.device_type || deviceType,
    operating_system: os,
    browser,
    browser_version: browserVersion,
    ip_address: ipAddress,
    location: clientData.location || "Addis Ababa, Ethiopia",
    user_agent: userAgent,
    domain,
    organization_type: domain === "federal" ? "government_structure" : domain,
    organization_id: organizationId,
    region_id: user.region_id || null,
    company_id: user.company_id || null,
    purchasing_center_id: user.purchasing_center_id || null,
    government_structure_id: user.government_structure_id || null,
    status: "active",
    last_activity_at: new Date(),
    expires_at: expiresAt,
  });

  await logSecurityEvent({
    eventType: "login_success",
    userId: user.user_id,
    actorId: user.user_id,
    sessionId: session.session_id,
    deviceFingerprintHash,
    ipAddress,
    userAgent,
    ...scopeData,
    details: { deviceName, os, browser },
  });

  return {
    session,
    sessionId: session.session_id,
    deviceFingerprintHash,
  };
}

/**
 * Validate active session on every authenticated request
 */
async function validateSession({ sessionId, userId, req }) {
  if (!sessionId) return null;

  const session = await UserSession.findByPk(sessionId);
  if (!session) {
    const err = new Error("Session not found or has been revoked.");
    err.code = "SESSION_TERMINATED";
    err.status = 401;
    throw err;
  }

  if (session.status !== "active") {
    const err = new Error(`Session is ${session.status}. Please sign in again.`);
    err.code = "SESSION_TERMINATED";
    err.status = 401;
    throw err;
  }

  if (new Date(session.expires_at) < new Date()) {
    await session.update({ status: "expired" });
    const err = new Error("Session has expired. Please sign in again.");
    err.code = "SESSION_EXPIRED";
    err.status = 401;
    throw err;
  }

  const clientIp = getClientIp(req);
  const scopeData = {
    domain: session.domain,
    organizationId: session.organization_id,
    regionId: session.region_id,
    companyId: session.company_id,
    purchasingCenterId: session.purchasing_center_id,
  };

  // Check if device was restricted after login
  const deviceRestricted = await checkDeviceRestriction(session.device_fingerprint_hash, session.user_id, scopeData);
  if (deviceRestricted) {
    await session.update({
      status: "restricted",
      terminated_at: new Date(),
      termination_reason: `Device restricted: ${deviceRestricted.restriction_reason}`,
    });
    const err = new Error(`This device has been restricted: ${deviceRestricted.restriction_reason}`);
    err.code = "DEVICE_RESTRICTED";
    err.status = 403;
    throw err;
  }

  // Check if IP was restricted after login
  const ipRestricted = await checkIpRestriction(clientIp, scopeData);
  if (ipRestricted) {
    await session.update({
      status: "restricted",
      terminated_at: new Date(),
      termination_reason: `IP restricted: ${ipRestricted.restriction_reason}`,
    });
    const err = new Error(`Access from IP address ${clientIp} has been restricted: ${ipRestricted.restriction_reason}`);
    err.code = "IP_RESTRICTED";
    err.status = 403;
    throw err;
  }

  // Throttled last activity update (every 60s)
  const now = Date.now();
  const lastActivity = new Date(session.last_activity_at).getTime();
  if (now - lastActivity > 60 * 1000) {
    UserSession.update(
      { last_activity_at: new Date() },
      { where: { session_id: sessionId } }
    ).catch(() => {});
  }

  return session;
}

/**
 * Validate that an actor has authorization over the target session's organizational scope
 */
function assertSessionScopeAccessible(session, actorUser) {
  if (!actorUser) {
    const err = new Error("Authentication required.");
    err.status = 401;
    throw err;
  }

  const isSuperAdmin = (actorUser.roles || []).some(
    (r) => String(r).toLowerCase() === "super admin"
  );
  if (isSuperAdmin) return true;

  // Regional Admin boundary
  if (actorUser.is_regional) {
    if (session.region_id && session.region_id !== actorUser.region_id) {
      const err = new Error("Access denied: session belongs to another region.");
      err.status = 403;
      throw err;
    }
    if (session.domain !== "regional") {
      const err = new Error("Access denied: session belongs outside regional scope.");
      err.status = 403;
      throw err;
    }
    return true;
  }

  // Company Admin boundary
  if (actorUser.is_company) {
    if (session.company_id && session.company_id !== actorUser.company_id) {
      const err = new Error("Access denied: session belongs to another company.");
      err.status = 403;
      throw err;
    }
    if (session.domain !== "company") {
      const err = new Error("Access denied: session belongs outside company scope.");
      err.status = 403;
      throw err;
    }
    return true;
  }

  // Purchasing Center Admin boundary
  if (actorUser.is_purchasing_center) {
    if (session.purchasing_center_id && session.purchasing_center_id !== actorUser.purchasing_center_id) {
      const err = new Error("Access denied: session belongs to another purchasing center.");
      err.status = 403;
      throw err;
    }
    if (session.domain !== "purchasing_center") {
      const err = new Error("Access denied: session belongs outside purchasing center scope.");
      err.status = 403;
      throw err;
    }
    return true;
  }

  // Federal Admin boundary
  if (actorUser.is_federal) {
    if (session.domain !== "federal") {
      const err = new Error("Access denied: session belongs to a regional or company scope.");
      err.status = 403;
      throw err;
    }
    return true;
  }

  return true;
}

/**
 * Terminate a specific session
 */
async function terminateSession({ sessionId, actorUser, reason = "user_remote_terminate", req = null }) {
  const session = await UserSession.findByPk(sessionId, {
    include: [{ model: User, as: "user", attributes: ["user_id", "email", "full_name"] }],
  });

  if (!session) {
    const err = new Error("Session not found.");
    err.status = 404;
    throw err;
  }

  const isSelf = session.user_id === actorUser.user_id;

  // Authorization check
  if (isSelf) {
    const hasPerm =
      actorUser.permissions.includes("USER_SESSION:TERMINATE_OWN") ||
      actorUser.permissions.includes("USER_SESSION:TERMINATE");
    if (!hasPerm) {
      const err = new Error("Access denied: missing permission to terminate own session.");
      err.status = 403;
      throw err;
    }
  } else {
    const hasPerm = actorUser.permissions.includes("USER_SESSION:TERMINATE");
    if (!hasPerm) {
      const err = new Error("Access denied: missing administrative permission to terminate session.");
      err.status = 403;
      throw err;
    }
    assertSessionScopeAccessible(session, actorUser);
  }

  await session.update({
    status: "terminated",
    terminated_at: new Date(),
    terminated_by: actorUser.user_id,
    termination_reason: reason,
  });

  // Emit socket event to immediately kick client
  emitSocketRevocation(req, session.user_id, session.session_id, reason);

  await logSecurityEvent({
    eventType: "session_terminated",
    userId: session.user_id,
    actorId: actorUser.user_id,
    sessionId: session.session_id,
    deviceFingerprintHash: session.device_fingerprint_hash,
    ipAddress: session.ip_address,
    userAgent: session.user_agent,
    domain: session.domain,
    organizationId: session.organization_id,
    regionId: session.region_id,
    companyId: session.company_id,
    purchasingCenterId: session.purchasing_center_id,
    details: { reason, isSelf },
  });

  return session;
}

/**
 * Terminate all other sessions for a user
 */
async function terminateAllUserSessions({
  targetUserId,
  actorUser,
  exceptSessionId = null,
  reason = "terminate_all_sessions",
  req = null,
}) {
  const isSelf = targetUserId === actorUser.user_id;

  if (isSelf) {
    const hasPerm =
      actorUser.permissions.includes("USER_SESSION:TERMINATE_ALL_OWN") ||
      actorUser.permissions.includes("USER_SESSION:TERMINATE_ALL");
    if (!hasPerm) {
      const err = new Error("Access denied: missing permission to terminate all sessions.");
      err.status = 403;
      throw err;
    }
  } else {
    const hasPerm = actorUser.permissions.includes("USER_SESSION:TERMINATE_ALL");
    if (!hasPerm) {
      const err = new Error("Access denied: missing administrative permission to terminate all sessions.");
      err.status = 403;
      throw err;
    }

    // Verify target user scope
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      const err = new Error("User not found.");
      err.status = 404;
      throw err;
    }
    assertSessionScopeAccessible(targetUser, actorUser);
  }

  const whereClause = {
    user_id: targetUserId,
    status: "active",
  };

  if (exceptSessionId) {
    whereClause.session_id = { [Op.ne]: exceptSessionId };
  }

  const activeSessions = await UserSession.findAll({ where: whereClause });

  await UserSession.update(
    {
      status: "terminated",
      terminated_at: new Date(),
      terminated_by: actorUser.user_id,
      termination_reason: reason,
    },
    { where: whereClause }
  );

  activeSessions.forEach((s) => {
    emitSocketRevocation(req, targetUserId, s.session_id, reason);
  });

  await logSecurityEvent({
    eventType: "session_terminate_all",
    userId: targetUserId,
    actorId: actorUser.user_id,
    domain: actorUser.domain || "federal",
    regionId: actorUser.region_id,
    companyId: actorUser.company_id,
    purchasingCenterId: actorUser.purchasing_center_id,
    details: {
      terminatedCount: activeSessions.length,
      exceptSessionId,
      reason,
      isSelf,
    },
  });

  return activeSessions.length;
}

/**
 * Restrict a device completely
 */
async function restrictDevice({
  userId = null,
  deviceFingerprintHash,
  deviceName = null,
  deviceType = "desktop",
  operatingSystem = null,
  browser = null,
  reason,
  actorUser,
  durationMinutes = null,
  req = null,
}) {
  if (!deviceFingerprintHash) {
    const err = new Error("Device fingerprint is required.");
    err.status = 400;
    throw err;
  }
  if (!reason || !reason.trim()) {
    const err = new Error("Restriction reason is required.");
    err.status = 400;
    throw err;
  }

  const isSelf = userId === actorUser.user_id;

  if (isSelf) {
    const hasPerm =
      actorUser.permissions.includes("USER_SESSION:RESTRICT_OWN_DEVICE") ||
      actorUser.permissions.includes("USER_SESSION:RESTRICT_DEVICE");
    if (!hasPerm) {
      const err = new Error("Access denied: missing permission to restrict own device.");
      err.status = 403;
      throw err;
    }
  } else {
    const hasPerm = actorUser.permissions.includes("USER_SESSION:RESTRICT_DEVICE");
    if (!hasPerm) {
      const err = new Error("Access denied: missing administrative permission to restrict device.");
      err.status = 403;
      throw err;
    }
  }

  const domain = isSelf
    ? actorUser.domain || "federal"
    : actorUser.is_regional
    ? "regional"
    : actorUser.is_company
    ? "company"
    : actorUser.is_purchasing_center
    ? "purchasing_center"
    : "federal";

  const organizationId =
    actorUser.region_id ||
    actorUser.company_id ||
    actorUser.purchasing_center_id ||
    actorUser.government_structure_id ||
    null;

  const expiresAt = durationMinutes
    ? new Date(Date.now() + durationMinutes * 60 * 1000)
    : null;

  // Deactivate any existing active restriction for this device to avoid duplicates
  await UserDeviceRestriction.update(
    { is_active: false },
    {
      where: {
        device_fingerprint_hash: deviceFingerprintHash,
        user_id: isSelf ? userId : null,
        is_active: true,
      },
    }
  );

  const restriction = await UserDeviceRestriction.create({
    user_id: isSelf ? userId : null,
    device_fingerprint_hash: deviceFingerprintHash,
    device_name: deviceName,
    device_type: deviceType,
    operating_system: operatingSystem,
    browser,
    domain,
    organization_type: domain === "federal" ? "government_structure" : domain,
    organization_id: organizationId,
    region_id: actorUser.region_id || null,
    company_id: actorUser.company_id || null,
    purchasing_center_id: actorUser.purchasing_center_id || null,
    restriction_reason: reason.trim(),
    restricted_by: actorUser.user_id,
    restricted_at: new Date(),
    expires_at: expiresAt,
    is_active: true,
  });

  // Immediately terminate all active sessions associated with this device
  const sessionWhere = {
    device_fingerprint_hash: deviceFingerprintHash,
    status: "active",
  };
  if (isSelf) {
    sessionWhere.user_id = userId;
  } else if (actorUser.is_regional && actorUser.region_id) {
    sessionWhere.region_id = actorUser.region_id;
  } else if (actorUser.is_company && actorUser.company_id) {
    sessionWhere.company_id = actorUser.company_id;
  } else if (actorUser.is_purchasing_center && actorUser.purchasing_center_id) {
    sessionWhere.purchasing_center_id = actorUser.purchasing_center_id;
  }

  const affectedSessions = await UserSession.findAll({ where: sessionWhere });
  await UserSession.update(
    {
      status: "restricted",
      terminated_at: new Date(),
      terminated_by: actorUser.user_id,
      termination_reason: `Device restricted: ${reason.trim()}`,
    },
    { where: sessionWhere }
  );

  affectedSessions.forEach((s) => {
    emitSocketRevocation(req, s.user_id, s.session_id, "device_restricted");
  });

  await logSecurityEvent({
    eventType: "device_restricted",
    userId,
    actorId: actorUser.user_id,
    deviceFingerprintHash,
    domain,
    organizationId,
    regionId: actorUser.region_id,
    companyId: actorUser.company_id,
    purchasingCenterId: actorUser.purchasing_center_id,
    details: {
      restrictionId: restriction.restriction_id,
      reason: reason.trim(),
      affectedSessionsCount: affectedSessions.length,
      expiresAt,
    },
  });

  return restriction;
}

/**
 * Remove device restriction (unrestrict)
 */
async function unrestrictDevice({ restrictionId, actorUser }) {
  const restriction = await UserDeviceRestriction.findByPk(restrictionId);
  if (!restriction) {
    const err = new Error("Device restriction record not found.");
    err.status = 404;
    throw err;
  }

  const isSelf = restriction.user_id === actorUser.user_id;

  if (isSelf) {
    const hasPerm =
      actorUser.permissions.includes("USER_SESSION:UNRESTRICT_OWN_DEVICE") ||
      actorUser.permissions.includes("USER_SESSION:UNRESTRICT_DEVICE");
    if (!hasPerm) {
      const err = new Error("Access denied: missing permission to unrestrict own device.");
      err.status = 403;
      throw err;
    }
  } else {
    const hasPerm = actorUser.permissions.includes("USER_SESSION:UNRESTRICT_DEVICE");
    if (!hasPerm) {
      const err = new Error("Access denied: missing administrative permission to unrestrict device.");
      err.status = 403;
      throw err;
    }
    assertSessionScopeAccessible(restriction, actorUser);
  }

  await restriction.update({
    is_active: false,
    unrestricted_at: new Date(),
    unrestricted_by: actorUser.user_id,
  });

  await logSecurityEvent({
    eventType: "device_unrestricted",
    userId: restriction.user_id,
    actorId: actorUser.user_id,
    deviceFingerprintHash: restriction.device_fingerprint_hash,
    domain: restriction.domain,
    organizationId: restriction.organization_id,
    regionId: restriction.region_id,
    companyId: restriction.company_id,
    purchasingCenterId: restriction.purchasing_center_id,
    details: {
      restrictionId: restriction.restriction_id,
    },
  });

  return restriction;
}

/**
 * Restrict an IP address or CIDR range
 */
async function restrictIp({
  ipAddress,
  isCidr = false,
  reason,
  actorUser,
  durationMinutes = null,
  req = null,
}) {
  const hasPerm = actorUser.permissions.includes("USER_SESSION:RESTRICT_IP");
  if (!hasPerm) {
    const err = new Error("Access denied: missing permission to restrict IP address.");
    err.status = 403;
    throw err;
  }

  if (!ipAddress || !ipAddress.trim()) {
    const err = new Error("IP address is required.");
    err.status = 400;
    throw err;
  }
  if (!reason || !reason.trim()) {
    const err = new Error("Restriction reason is required.");
    err.status = 400;
    throw err;
  }

  const cleanIp = ipAddress.trim();
  const domain = actorUser.is_regional
    ? "regional"
    : actorUser.is_company
    ? "company"
    : actorUser.is_purchasing_center
    ? "purchasing_center"
    : "federal";

  const organizationId =
    actorUser.region_id ||
    actorUser.company_id ||
    actorUser.purchasing_center_id ||
    actorUser.government_structure_id ||
    null;

  const expiresAt = durationMinutes
    ? new Date(Date.now() + durationMinutes * 60 * 1000)
    : null;

  const restriction = await IpRestriction.create({
    ip_address: cleanIp,
    is_cidr: isCidr || cleanIp.includes("/"),
    domain,
    organization_type: domain === "federal" ? "government_structure" : domain,
    organization_id: organizationId,
    region_id: actorUser.region_id || null,
    company_id: actorUser.company_id || null,
    purchasing_center_id: actorUser.purchasing_center_id || null,
    restriction_reason: reason.trim(),
    restricted_by: actorUser.user_id,
    restricted_at: new Date(),
    expires_at: expiresAt,
    is_active: true,
  });

  // Terminate active sessions in scope coming from that IP
  const sessionWhere = {
    ip_address: cleanIp,
    status: "active",
  };
  if (actorUser.is_regional && actorUser.region_id) {
    sessionWhere.region_id = actorUser.region_id;
  } else if (actorUser.is_company && actorUser.company_id) {
    sessionWhere.company_id = actorUser.company_id;
  } else if (actorUser.is_purchasing_center && actorUser.purchasing_center_id) {
    sessionWhere.purchasing_center_id = actorUser.purchasing_center_id;
  }

  const affectedSessions = await UserSession.findAll({ where: sessionWhere });
  await UserSession.update(
    {
      status: "restricted",
      terminated_at: new Date(),
      terminated_by: actorUser.user_id,
      termination_reason: `IP restricted: ${reason.trim()}`,
    },
    { where: sessionWhere }
  );

  affectedSessions.forEach((s) => {
    emitSocketRevocation(req, s.user_id, s.session_id, "ip_restricted");
  });

  await logSecurityEvent({
    eventType: "ip_restricted",
    actorId: actorUser.user_id,
    ipAddress: cleanIp,
    domain,
    organizationId,
    regionId: actorUser.region_id,
    companyId: actorUser.company_id,
    purchasingCenterId: actorUser.purchasing_center_id,
    details: {
      restrictionId: restriction.restriction_id,
      reason: reason.trim(),
      isCidr: restriction.is_cidr,
      affectedSessionsCount: affectedSessions.length,
      expiresAt,
    },
  });

  return restriction;
}

/**
 * Remove an IP restriction
 */
async function unrestrictIp({ restrictionId, actorUser }) {
  const hasPerm = actorUser.permissions.includes("USER_SESSION:UNRESTRICT_IP");
  if (!hasPerm) {
    const err = new Error("Access denied: missing permission to unrestrict IP address.");
    err.status = 403;
    throw err;
  }

  const restriction = await IpRestriction.findByPk(restrictionId);
  if (!restriction) {
    const err = new Error("IP restriction record not found.");
    err.status = 404;
    throw err;
  }

  assertSessionScopeAccessible(restriction, actorUser);

  await restriction.update({
    is_active: false,
    unrestricted_at: new Date(),
    unrestricted_by: actorUser.user_id,
  });

  await logSecurityEvent({
    eventType: "ip_unrestricted",
    actorId: actorUser.user_id,
    ipAddress: restriction.ip_address,
    domain: restriction.domain,
    organizationId: restriction.organization_id,
    regionId: restriction.region_id,
    companyId: restriction.company_id,
    purchasingCenterId: restriction.purchasing_center_id,
    details: {
      restrictionId: restriction.restriction_id,
    },
  });

  return restriction;
}

module.exports = {
  createSession,
  validateSession,
  terminateSession,
  terminateAllUserSessions,
  restrictDevice,
  unrestrictDevice,
  restrictIp,
  unrestrictIp,
  checkIpRestriction,
  checkDeviceRestriction,
  assertSessionScopeAccessible,
  logSecurityEvent,
};

