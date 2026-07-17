"use strict";

const fs = require("fs");
const path = require("path");

const logsDir = path.join(__dirname, "..", "logs");
const logFile = path.join(logsDir, "app.log");
const logToFile = process.env.LOG_TO_FILE === "true";
const isProduction = process.env.NODE_ENV === "production";

if (logToFile && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function writeStructured(level, message, meta = {}) {
  const payload = {
    level,
    time: new Date().toISOString(),
    msg: typeof message === "string" ? message : String(message),
    ...meta,
  };
  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }

  if (logToFile) {
    fs.appendFile(logFile, `${line}\n`, (err) => {
      if (err) console.error(JSON.stringify({ level: "error", msg: "log_file_write_failed", err: err.message }));
    });
  }
}

/** Accept either logger.info("msg") or logger.info({ meta }, "msg") */
function log(level, a, b) {
  if (typeof a === "object" && a !== null && typeof b === "string") {
    writeStructured(level, b, a);
    return;
  }
  if (typeof a === "object" && a !== null && b === undefined) {
    const { msg, message, ...rest } = a;
    writeStructured(level, msg || message || "log", rest);
    return;
  }
  writeStructured(level, a, typeof b === "object" && b ? b : {});
}

module.exports = {
  info: (a, b) => log("info", a, b),
  warn: (a, b) => log("warn", a, b),
  error: (a, b) => log("error", a, b),
  debug: (a, b) => {
    if (!isProduction || process.env.LOG_LEVEL === "debug") log("debug", a, b);
  },
};
