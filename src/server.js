"use strict";

require("dotenv").config();

const { ChatServer } = require("./core/ChatServer");

/**
 * Standalone entry point.
 * Reads configuration from environment variables and starts the server.
 *
 * Supported env vars:
 *   PORT                     - Server port (default: 5030)
 *   CORS_ORIGIN              - Comma-separated allowed origins (default: none → all blocked)
 *   AUTH_ENABLED              - "true" to enable JWT auth
 *   JWT_SECRET                - JWT secret key
 *   ENCRYPTION_ENABLED        - "true" to enable payload encryption
 *   ENCRYPTION_SECRET         - Encryption secret key
 *   ENCRYPTION_SALT           - Encryption salt (optional)
 *   RATE_LIMIT_ENABLED        - "false" to disable rate limiting
 *   RATE_LIMIT_WINDOW_MS      - Rate limit window in ms (default: 1000)
 *   RATE_LIMIT_MAX_EVENTS     - Max events per window (default: 50)
 *   MAX_MESSAGE_SIZE          - Max message payload in bytes (default: 4096)
 *   LOG_LEVEL                 - debug | info | warn | error | silent
 */

function parseOrigins(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

const config = {
  port: parseInt(process.env.PORT, 10) || 5030,

  cors: {
    origin: parseOrigins(process.env.CORS_ORIGIN),
    methods: ["GET", "POST"],
    credentials: true,
  },

  auth: {
    enabled: process.env.AUTH_ENABLED === "true",
    jwtSecret: process.env.JWT_SECRET || "",
  },

  encryption: {
    enabled: process.env.ENCRYPTION_ENABLED === "true",
    secret: process.env.ENCRYPTION_SECRET || "",
    salt: process.env.ENCRYPTION_SALT || undefined,
  },

  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== "false",
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 1000,
    maxEvents: parseInt(process.env.RATE_LIMIT_MAX_EVENTS, 10) || 50,
  },

  maxMessageSize: parseInt(process.env.MAX_MESSAGE_SIZE, 10) || 4096,

  logging: {
    level: process.env.LOG_LEVEL || "info",
  },
};

const server = new ChatServer(config);

server.start().catch((err) => {
  console.error("Failed to start chat server:", err);
  process.exit(1);
});
