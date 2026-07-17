process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test-jwt-secret-at-least-32-characters-long";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
process.env.PORT = process.env.PORT || "0";
process.env.SOCKET_PORT = process.env.SOCKET_PORT || "0";
