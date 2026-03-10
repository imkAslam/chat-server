"use strict";

const jwt = require("jsonwebtoken");
const { AuthenticationError } = require("../utils/errors");

/**
 * Creates a Socket.IO middleware that authenticates connections.
 *
 * Strategy:
 *  1. If JWT secret is configured, verify `socket.handshake.auth.token`.
 *  2. If a custom auth hook is provided, delegate to it.
 *  3. If neither is configured, allow the connection (auth disabled).
 *
 * On success the decoded user payload is attached to `socket.user`.
 *
 * @param {object} authConfig - `{ enabled, jwtSecret, customAuth }`
 * @param {import("../utils/logger").Logger} logger
 * @returns {(socket: import("socket.io").Socket, next: Function) => void}
 */
function createAuthMiddleware(authConfig, logger) {
  return (socket, next) => {
    if (!authConfig.enabled) {
      return next();
    }

    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];

    if (authConfig.jwtSecret && token) {
      try {
        const decoded = jwt.verify(token, authConfig.jwtSecret);
        socket.user = decoded;
        logger.debug(`Auth: JWT verified for user ${decoded.sub || decoded.id || "unknown"}`);
        return next();
      } catch (err) {
        logger.warn(`Auth: JWT verification failed — ${err.message}`);
        if (!authConfig.customAuth) {
          return next(new AuthenticationError("Invalid or expired token"));
        }
        // Fall through to custom auth
      }
    }

    if (authConfig.customAuth) {
      try {
        return authConfig.customAuth(socket, (err) => {
          if (err) {
            logger.warn(`Auth: custom auth rejected — ${err.message || err}`);
            return next(new AuthenticationError(err.message || "Authentication rejected"));
          }
          logger.debug(`Auth: custom auth accepted for socket ${socket.id}`);
          next();
        });
      } catch (err) {
        logger.error(`Auth: custom auth threw — ${err.message}`);
        return next(new AuthenticationError("Authentication error"));
      }
    }

    if (!token && authConfig.jwtSecret) {
      return next(new AuthenticationError("No authentication token provided"));
    }

    next();
  };
}

module.exports = { createAuthMiddleware };
