"use strict";

/** @type {import('../types').ChatServerConfig} */
const DEFAULTS = {
  port: 5030,

  cors: {
    origin: [],
    methods: ["GET", "POST"],
    credentials: true,
  },

  socketIO: {
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6,
    connectTimeout: 45000,
    transports: ["websocket", "polling"],
    allowUpgrades: true,
    perMessageDeflate: true,
    httpCompression: true,
  },

  auth: {
    enabled: false,
    jwtSecret: "",
    /**
     * Custom auth hook: `(socket, next) => void`.
     * Called when JWT is not configured or token is absent.
     * @type {((socket: any, next: Function) => void) | null}
     */
    customAuth: null,
  },

  encryption: {
    enabled: false,
    secret: "",
    salt: "chat-server-default-salt",
  },

  rateLimit: {
    enabled: true,
    windowMs: 1000,
    maxEvents: 50,
  },

  maxMessageSize: 4096,
  gracefulShutdownTimeoutMs: 10000,

  logging: {
    level: "info",
  },
};

/**
 * Deep-merges user config over defaults. Arrays are replaced, not concatenated.
 * @param {object} target
 * @param {object} source
 * @returns {object}
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = target[key];
    if (
      srcVal &&
      typeof srcVal === "object" &&
      !Array.isArray(srcVal) &&
      tgtVal &&
      typeof tgtVal === "object" &&
      !Array.isArray(tgtVal)
    ) {
      result[key] = deepMerge(tgtVal, srcVal);
    } else if (srcVal !== undefined) {
      result[key] = srcVal;
    }
  }
  return result;
}

/**
 * Builds a validated config by merging user overrides onto defaults.
 * @param {object} [userConfig]
 * @returns {object}
 */
function buildConfig(userConfig = {}) {
  const config = deepMerge(DEFAULTS, userConfig);

  if (config.auth.enabled && !config.auth.jwtSecret && !config.auth.customAuth) {
    throw new Error("Auth is enabled but neither jwtSecret nor customAuth is provided.");
  }
  if (config.encryption.enabled && !config.encryption.secret) {
    throw new Error("Encryption is enabled but no secret is provided.");
  }

  return config;
}

module.exports = { DEFAULTS, deepMerge, buildConfig };
