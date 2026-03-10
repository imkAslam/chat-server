"use strict";

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 };

class Logger {
  /**
   * @param {{ level?: string, prefix?: string, transport?: (entry: object) => void }} [opts]
   */
  constructor(opts = {}) {
    this.level = LOG_LEVELS[opts.level] ?? LOG_LEVELS.info;
    this.prefix = opts.prefix || "chat-server";
    this._transport = opts.transport || null;
  }

  /** @param  {...any} args */
  debug(...args) {
    this._log("debug", args);
  }
  /** @param  {...any} args */
  info(...args) {
    this._log("info", args);
  }
  /** @param  {...any} args */
  warn(...args) {
    this._log("warn", args);
  }
  /** @param  {...any} args */
  error(...args) {
    this._log("error", args);
  }

  _log(level, args) {
    if (LOG_LEVELS[level] < this.level) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      prefix: this.prefix,
      message: args
        .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
        .join(" "),
    };

    if (this._transport) {
      this._transport(entry);
      return;
    }

    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    fn(`[${entry.timestamp}] [${this.prefix}] [${level.toUpperCase()}] ${entry.message}`);
  }
}

module.exports = { Logger, LOG_LEVELS };
