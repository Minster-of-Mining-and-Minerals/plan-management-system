"use strict";

const db = require("../../models");
const {
  UserSession,
  UserDeviceRestriction,
  IpRestriction,
  SessionSecurityLog,
  User,
  Region,
  Company,
  PurchasingCenter,
  GovernmentStructure,
} = db;
const {
  terminateSession,
  terminateAllUserSessions,
  restrictDevice,
  unrestrictDevice,
  restrictIp,
  unrestrictIp,
  assertSessionScopeAccessible,
} = require("../../services/sessionSecurityService");
const { getSafeSessionId } = require("../../utils/deviceDetector");
const { Op } = require("sequelize");

/**
 * Apply organizational domain filters based on actor's scope
 */
function applyScopeFilter(whereClause, actorUser) {
  const isSuperAdmin = (actorUser.roles || []).some(
    (r) => String(r).toLowerCase() === "super admin"
  );
  if (isSuperAdmin) return whereClause;

  if (actorUser.is_regional) {
    whereClause.domain = "regional";
    whereClause.region_id = actorUser.region_id;
  } else if (actorUser.is_company) {
    whereClause.domain = "company";
    whereClause.company_id = actorUser.company_id;
  } else if (actorUser.is_purchasing_center) {
    whereClause.domain = "purchasing_center";
    whereClause.purchasing_center_id = actorUser.purchasing_center_id;
  } else if (actorUser.is_federal) {
    whereClause.domain = "federal";
  }

  return whereClause;
}

/**
 * Overview metrics for Administrative Session Management
 */
const getSessionMetrics = async (req, res) => {
  try {
    const actorUser = req.user;
    const baseWhere = applyScopeFilter({}, actorUser);

    const activeWhere = { ...baseWhere, status: "active" };

    // 1. Total active sessions
    const totalActiveSessions = await UserSession.count({ where: activeWhere });

    // 2. Active users count
    const activeUsersResult = await UserSession.findAll({
      where: activeWhere,
      attributes: [[db.sequelize.fn("DISTINCT", db.sequelize.col("user_id")), "user_id"]],
      raw: true,
    });
    const activeUsersCount = activeUsersResult.length;

    // 3. Active distinct devices count
    const activeDevicesResult = await UserSession.findAll({
      where: activeWhere,
      attributes: [
        [
          db.sequelize.fn("DISTINCT", db.sequelize.col("device_fingerprint_hash")),
          "device_fingerprint_hash",
        ],
      ],
      raw: true,
    });
    const activeDevicesCount = activeDevicesResult.length;

    // 4. Restricted devices count (active)
    const deviceRestrWhere = { is_active: true };
    applyScopeFilter(deviceRestrWhere, actorUser);
    const restrictedDevicesCount = await UserDeviceRestriction.count({
      where: deviceRestrWhere,
    });

    // 5. Restricted IP addresses count (active)
    const ipRestrWhere = { is_active: true };
    applyScopeFilter(ipRestrWhere, actorUser);
    const restrictedIpsCount = await IpRestriction.count({
      where: ipRestrWhere,
    });

    // 6. Terminated sessions in the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const terminatedRecentlyCount = await UserSession.count({
      where: {
        ...baseWhere,
        status: "terminated",
        terminated_at: { [Op.gte]: yesterday },
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        total_active_sessions: totalActiveSessions,
        active_users: activeUsersCount,
        active_devices: activeDevicesCount,
        restricted_devices: restrictedDevicesCount,
        restricted_ips: restrictedIpsCount,
        terminated_recently: terminatedRecentlyCount,
      },
    });
  } catch (error) {
    console.error("getSessionMetrics error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch session metrics",
      error: error.message,
    });
  }
};

/**
 * Filterable, searchable, paginated list of sessions for admin
 */
const getSessions = async (req, res) => {
  try {
    const actorUser = req.user;
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      device_type = "",
      operating_system = "",
      domain = "",
      region_id = "",
      company_id = "",
      purchasing_center_id = "",
      user_id = "",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    let whereClause = applyScopeFilter({}, actorUser);

    if (status) {
      whereClause.status = status;
    }
    if (device_type) {
      whereClause.device_type = device_type;
    }
    if (operating_system) {
      whereClause.operating_system = { [Op.iLike]: `%${operating_system}%` };
    }
    if (user_id) {
      whereClause.user_id = user_id;
    }

    // Super Admin domain and organization filters
    const isSuperAdmin = (actorUser.roles || []).some(
      (r) => String(r).toLowerCase() === "super admin"
    );
    if (isSuperAdmin) {
      if (domain) whereClause.domain = domain;
      if (region_id) whereClause.region_id = region_id;
      if (company_id) whereClause.company_id = company_id;
      if (purchasing_center_id) whereClause.purchasing_center_id = purchasing_center_id;
    }

    // Search filter across IP, device, browser, OS, and User name/email
    const userIncludeWhere = {};
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      whereClause[Op.or] = [
        { ip_address: { [Op.iLike]: q } },
        { device_name: { [Op.iLike]: q } },
        { operating_system: { [Op.iLike]: q } },
        { browser: { [Op.iLike]: q } },
        { location: { [Op.iLike]: q } },
        { "$user.full_name$": { [Op.iLike]: q } },
        { "$user.email$": { [Op.iLike]: q } },
      ];
    }

    const { count, rows } = await UserSession.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: [
            "user_id",
            "full_name",
            "email",
            "phone_number",
            "profile_image",
            "region_id",
            "company_id",
            "purchasing_center_id",
          ],
          include: [
            { model: Region, as: "region", attributes: ["region_id", "name"] },
            { model: Company, as: "company", attributes: ["company_id", "name"] },
            { model: PurchasingCenter, as: "purchasingCenter", attributes: ["purchasing_center_id", "name"] },
            { model: GovernmentStructure, as: "governmentStructure", attributes: ["structure_id", "name"] },
          ],
        },
      ],
      order: [
        ["status", "ASC"],
        ["last_activity_at", "DESC"],
      ],
      limit: limitNum,
      offset,
      distinct: true,
    });

    const formattedRows = rows.map((s) => ({
      session_id: s.session_id,
      masked_id: getSafeSessionId(s.session_id),
      user_id: s.user_id,
      user: s.user
        ? {
            user_id: s.user.user_id,
            full_name: s.user.full_name,
            email: s.user.email,
            phone_number: s.user.phone_number,
            profile_image: s.user.profile_image,
            organization_name:
              s.user.region?.name ||
              s.user.company?.name ||
              s.user.purchasingCenter?.name ||
              s.user.governmentStructure?.name ||
              "Federal Authority",
          }
        : null,
      device_name: s.device_name || "Unknown Device",
      device_type: s.device_type || "desktop",
      operating_system: s.operating_system || "Unknown OS",
      browser: s.browser || "Unknown Browser",
      browser_version: s.browser_version || "",
      ip_address: s.ip_address,
      location: s.location || "Addis Ababa, Ethiopia",
      domain: s.domain,
      status: s.status,
      created_at: s.created_at,
      last_activity_at: s.last_activity_at,
      expires_at: s.expires_at,
      terminated_at: s.terminated_at,
      termination_reason: s.termination_reason,
      device_fingerprint_hash: s.device_fingerprint_hash,
      is_current: s.session_id === req.sessionId,
    }));

    return res.status(200).json({
      success: true,
      data: formattedRows,
      meta: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    console.error("getSessions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sessions",
      error: error.message,
    });
  }
};

/**
 * Administrative termination of an individual session
 */
const terminateSessionAdmin = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reason = "administrative_termination" } = req.body;

    const terminated = await terminateSession({
      sessionId,
      actorUser: req.user,
      reason,
      req,
    });

    return res.status(200).json({
      success: true,
      message: "Session terminated successfully by administrator",
      data: {
        session_id: terminated.session_id,
        status: terminated.status,
      },
    });
  } catch (error) {
    console.error("terminateSessionAdmin error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to terminate session",
    });
  }
};

/**
 * Administrative termination of all sessions for a user
 */
const terminateUserSessionsAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason = "administrative_terminate_all_sessions" } = req.body;

    const count = await terminateAllUserSessions({
      targetUserId: userId,
      actorUser: req.user,
      reason,
      req,
    });

    return res.status(200).json({
      success: true,
      message: `Successfully terminated ${count} active session(s) for the user`,
      data: { terminated_count: count },
    });
  } catch (error) {
    console.error("terminateUserSessionsAdmin error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to terminate user sessions",
    });
  }
};

/**
 * List device restrictions within scope
 */
const getDeviceRestrictions = async (req, res) => {
  try {
    const actorUser = req.user;
    const { page = 1, limit = 20, is_active } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const whereClause = applyScopeFilter({}, actorUser);
    if (is_active !== undefined) {
      whereClause.is_active = is_active === "true" || is_active === true;
    }

    const { count, rows } = await UserDeviceRestriction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["user_id", "full_name", "email"],
        },
        {
          model: User,
          as: "restrictedByUser",
          attributes: ["user_id", "full_name", "email"],
        },
      ],
      order: [["restricted_at", "DESC"]],
      limit: limitNum,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      meta: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    console.error("getDeviceRestrictions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch device restrictions",
      error: error.message,
    });
  }
};

/**
 * Create a device restriction (administrative)
 */
const createDeviceRestriction = async (req, res) => {
  try {
    const {
      device_fingerprint_hash,
      user_id = null,
      device_name,
      device_type,
      operating_system,
      browser,
      reason,
      duration_minutes,
    } = req.body;

    const restriction = await restrictDevice({
      userId: user_id || null,
      deviceFingerprintHash: device_fingerprint_hash,
      deviceName,
      deviceType,
      operatingSystem,
      browser,
      reason,
      actorUser: req.user,
      durationMinutes: duration_minutes ? parseInt(duration_minutes, 10) : null,
      req,
    });

    return res.status(201).json({
      success: true,
      message: "Device restricted successfully.",
      data: restriction,
    });
  } catch (error) {
    console.error("createDeviceRestriction error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to restrict device",
    });
  }
};

/**
 * Remove a device restriction (administrative)
 */
const deleteDeviceRestriction = async (req, res) => {
  try {
    const { restrictionId } = req.params;

    const restriction = await unrestrictDevice({
      restrictionId,
      actorUser: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "Device restriction removed successfully.",
      data: restriction,
    });
  } catch (error) {
    console.error("deleteDeviceRestriction error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to remove device restriction",
    });
  }
};

/**
 * List IP restrictions within scope
 */
const getIpRestrictions = async (req, res) => {
  try {
    const actorUser = req.user;
    const { page = 1, limit = 20, is_active } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const whereClause = applyScopeFilter({}, actorUser);
    if (is_active !== undefined) {
      whereClause.is_active = is_active === "true" || is_active === true;
    }

    const { count, rows } = await IpRestriction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "restrictedByUser",
          attributes: ["user_id", "full_name", "email"],
        },
      ],
      order: [["restricted_at", "DESC"]],
      limit: limitNum,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      meta: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    console.error("getIpRestrictions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch IP restrictions",
      error: error.message,
    });
  }
};

/**
 * Create an IP restriction (administrative)
 */
const createIpRestriction = async (req, res) => {
  try {
    const {
      ip_address,
      is_cidr = false,
      reason,
      duration_minutes,
    } = req.body;

    const restriction = await restrictIp({
      ipAddress: ip_address,
      isCidr,
      reason,
      actorUser: req.user,
      durationMinutes: duration_minutes ? parseInt(duration_minutes, 10) : null,
      req,
    });

    return res.status(201).json({
      success: true,
      message: "IP address restriction created successfully.",
      data: restriction,
    });
  } catch (error) {
    console.error("createIpRestriction error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to restrict IP",
    });
  }
};

/**
 * Remove an IP restriction (administrative)
 */
const deleteIpRestriction = async (req, res) => {
  try {
    const { restrictionId } = req.params;

    const restriction = await unrestrictIp({
      restrictionId,
      actorUser: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "IP restriction removed successfully.",
      data: restriction,
    });
  } catch (error) {
    console.error("deleteIpRestriction error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to remove IP restriction",
    });
  }
};

/**
 * List session security audit logs within scope
 */
const getSessionSecurityLogs = async (req, res) => {
  try {
    const actorUser = req.user;
    const {
      page = 1,
      limit = 20,
      event_type,
      user_id,
      date_from,
      date_to,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const whereClause = applyScopeFilter({}, actorUser);

    if (event_type) {
      whereClause.event_type = event_type;
    }
    if (user_id) {
      whereClause.user_id = user_id;
    }
    if (date_from || date_to) {
      whereClause.created_at = {};
      if (date_from) whereClause.created_at[Op.gte] = new Date(date_from);
      if (date_to) whereClause.created_at[Op.lte] = new Date(date_to);
    }

    const { count, rows } = await SessionSecurityLog.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["user_id", "full_name", "email"],
        },
        {
          model: User,
          as: "actor",
          attributes: ["user_id", "full_name", "email"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: limitNum,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      meta: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    console.error("getSessionSecurityLogs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch session security audit logs",
      error: error.message,
    });
  }
};

module.exports = {
  getSessionMetrics,
  getSessions,
  terminateSessionAdmin,
  terminateUserSessionsAdmin,
  getDeviceRestrictions,
  createDeviceRestriction,
  deleteDeviceRestriction,
  getIpRestrictions,
  createIpRestriction,
  deleteIpRestriction,
  getSessionSecurityLogs,
};

