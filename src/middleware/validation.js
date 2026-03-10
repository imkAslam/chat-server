"use strict";

const { ValidationError } = require("../utils/errors");

/**
 * Validates incoming event payloads against simple schema rules.
 * Used by channels to guard their handlers.
 */

/**
 * @typedef {Object} FieldRule
 * @property {string} type - "string" | "number" | "boolean" | "object" | "array"
 * @property {boolean} [required]
 * @property {number} [maxLength] - For strings.
 * @property {number} [min] - For numbers.
 * @property {number} [max] - For numbers.
 */

/**
 * Validates `data` against a schema map of field rules.
 * @param {object} data
 * @param {Record<string, FieldRule>} schema
 * @param {number} [maxMessageSize] - Reject if JSON-serialized size exceeds this.
 * @throws {ValidationError}
 */
function validate(data, schema, maxMessageSize) {
  if (data === null || data === undefined || typeof data !== "object") {
    throw new ValidationError("Payload must be a non-null object");
  }

  if (maxMessageSize) {
    const size = Buffer.byteLength(JSON.stringify(data), "utf8");
    if (size > maxMessageSize) {
      throw new ValidationError(`Payload exceeds max size of ${maxMessageSize} bytes`);
    }
  }

  const errors = {};

  for (const [field, rule] of Object.entries(schema)) {
    const value = data[field];

    if (rule.required && (value === undefined || value === null || value === "")) {
      errors[field] = `${field} is required`;
      continue;
    }

    if (value === undefined || value === null) continue;

    if (rule.type === "array") {
      if (!Array.isArray(value)) {
        errors[field] = `${field} must be an array`;
        continue;
      }
    } else if (typeof value !== rule.type) {
      errors[field] = `${field} must be of type ${rule.type}`;
      continue;
    }

    if (rule.type === "string" && rule.maxLength && value.length > rule.maxLength) {
      errors[field] = `${field} exceeds max length of ${rule.maxLength}`;
    }

    if (rule.type === "number") {
      if (rule.min !== undefined && value < rule.min) {
        errors[field] = `${field} must be >= ${rule.min}`;
      }
      if (rule.max !== undefined && value > rule.max) {
        errors[field] = `${field} must be <= ${rule.max}`;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError("Validation failed", errors);
  }
}

/**
 * Wraps a Socket.IO event handler with schema validation.
 * @param {Record<string, FieldRule>} schema
 * @param {Function} handler - `(socket, data, ...rest) => void`
 * @param {number} [maxMessageSize]
 * @returns {(data: any, ...rest: any[]) => void} Bound to a socket via `.call(socket, ...)`.
 */
function withValidation(schema, handler, maxMessageSize) {
  return function validatedHandler(data, ...rest) {
    try {
      validate(data, schema, maxMessageSize);
      return handler(this, data, ...rest);
    } catch (err) {
      if (err instanceof ValidationError) {
        this.emit("error", { code: err.code, message: err.message, details: err.details });
        return;
      }
      throw err;
    }
  };
}

module.exports = { validate, withValidation };
