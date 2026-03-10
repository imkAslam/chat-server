"use strict";

const { RateLimitError } = require("../utils/errors");

/**
 * Per-socket sliding-window rate limiter.
 * Wraps a Socket.IO socket so that every incoming event is counted.
 *
 * @param {object} config - `{ enabled, windowMs, maxEvents }`
 * @param {import("../utils/logger").Logger} logger
 * @returns {(socket: import("socket.io").Socket, next: Function) => void}
 */
function createRateLimiter(config, logger) {
  if (!config.enabled) {
    return (_socket, next) => next();
  }

  const { windowMs, maxEvents } = config;

  /** @type {Map<string, number[]>} socketId -> timestamps[] */
  const windows = new Map();

  return (socket, next) => {
    const originalOnEvent = socket._onEvent || socket.onevent;
    if (!originalOnEvent) return next();

    socket.onevent = function rateLimitedOnEvent(packet) {
      const now = Date.now();
      let timestamps = windows.get(socket.id);
      if (!timestamps) {
        timestamps = [];
        windows.set(socket.id, timestamps);
      }

      const windowStart = now - windowMs;
      while (timestamps.length > 0 && timestamps[0] <= windowStart) {
        timestamps.shift();
      }

      if (timestamps.length >= maxEvents) {
        logger.warn(`RateLimit: socket ${socket.id} exceeded ${maxEvents} events/${windowMs}ms`);
        socket.emit("error", { code: "RATE_LIMIT", message: new RateLimitError().message });
        return;
      }

      timestamps.push(now);
      originalOnEvent.call(this, packet);
    };

    socket.on("disconnect", () => {
      windows.delete(socket.id);
    });

    next();
  };
}

module.exports = { createRateLimiter };
