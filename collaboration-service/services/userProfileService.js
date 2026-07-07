const { getIntegrationAdapters } = require("./integrationContext");

const PLAN_API_URL = process.env.PLAN_API_URL || "http://localhost:4000/api";

async function fetchPlanApi(pathname, accessToken, options = {}) {
  const response = await fetch(`${PLAN_API_URL}${pathname}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    body: options.body,
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

async function getUserProfile(accessToken, user = null) {
  const adapters = getIntegrationAdapters();
  if (user && adapters.getUserProfile) {
    return adapters.getUserProfile(user);
  }

  const result = await fetchPlanApi("/auth/me", accessToken);
  if (!result.ok) {
    return {
      user_id: null,
      full_name: "User",
      email: "",
    };
  }

  const profileUser = result.data?.data?.user;
  return {
    user_id: profileUser?.user_id,
    full_name: profileUser?.full_name || profileUser?.email || "User",
    email: profileUser?.email || "",
  };
}

async function getUserPermissions(accessToken, user = null) {
  const adapters = getIntegrationAdapters();
  if (user && adapters.getPermissions) {
    return {
      roles: user.roles || [],
      permissions: adapters.getPermissions(user),
    };
  }

  const result = await fetchPlanApi("/auth/permissions", accessToken);
  if (!result.ok) {
    return { roles: [], permissions: [] };
  }

  return {
    roles: result.data?.data?.roles || [],
    permissions: (result.data?.data?.permissions || []).map((p) => p.toUpperCase()),
  };
}

async function resolveUserDisplayNames(accessToken, userIds = [], user = null) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueIds.length) {
    return {};
  }

  const adapters = getIntegrationAdapters();
  if (user && adapters.resolveUserDisplayNames) {
    return adapters.resolveUserDisplayNames(user, uniqueIds);
  }

  const result = await fetchPlanApi("/users/display-names", accessToken, {
    method: "POST",
    body: JSON.stringify({ user_ids: uniqueIds }),
  });

  if (!result.ok) {
    return {};
  }

  return result.data?.data || {};
}

module.exports = {
  getUserProfile,
  getUserPermissions,
  resolveUserDisplayNames,
};
