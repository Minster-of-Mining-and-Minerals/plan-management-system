"use strict";

/**
 * Socket.IO handler for Command Center real-time updates
 */
function initDashboardSocket(io) {
  if (!io) return;

  io.on("connection", (socket) => {
    socket.on("dashboard:subscribe", (data) => {
      socket.join("command_center_room");
    });

    socket.on("dashboard:unsubscribe", (data) => {
      socket.leave("command_center_room");
    });
  });
}

function broadcastDashboardUpdate(io, payload = {}) {
  if (!io) return;
  io.to("command_center_room").emit("dashboard:update", {
    timestamp: new Date().toISOString(),
    ...payload,
  });
}

module.exports = {
  initDashboardSocket,
  broadcastDashboardUpdate,
};
