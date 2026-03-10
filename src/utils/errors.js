"use strict";

class ChatServerError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {number} [statusCode]
   */
  constructor(message, code, statusCode = 500) {
    super(message);
    this.name = "ChatServerError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

class AuthenticationError extends ChatServerError {
  /** @param {string} [message] */
  constructor(message = "Authentication failed") {
    super(message, "AUTH_FAILED", 401);
    this.name = "AuthenticationError";
  }
}

class AuthorizationError extends ChatServerError {
  /** @param {string} [message] */
  constructor(message = "Permission denied") {
    super(message, "FORBIDDEN", 403);
    this.name = "AuthorizationError";
  }
}

class ValidationError extends ChatServerError {
  /**
   * @param {string} [message]
   * @param {object} [details]
   */
  constructor(message = "Validation failed", details = {}) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
    this.details = details;
  }
}

class RateLimitError extends ChatServerError {
  /** @param {string} [message] */
  constructor(message = "Rate limit exceeded") {
    super(message, "RATE_LIMIT", 429);
    this.name = "RateLimitError";
  }
}

class EncryptionError extends ChatServerError {
  /** @param {string} [message] */
  constructor(message = "Encryption/decryption failed") {
    super(message, "ENCRYPTION_ERROR", 500);
    this.name = "EncryptionError";
  }
}

class AdapterError extends ChatServerError {
  /** @param {string} [message] */
  constructor(message = "Adapter operation failed") {
    super(message, "ADAPTER_ERROR", 500);
    this.name = "AdapterError";
  }
}

module.exports = {
  ChatServerError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  RateLimitError,
  EncryptionError,
  AdapterError,
};
