"use strict";

const { v7: uuidv7 } = require("uuid");

/**
 * Generates a UUID v7 (time-ordered, lexicographically sortable).
 * @returns {string}
 */
function generateId() {
  return uuidv7();
}

/**
 * Extracts the embedded Unix timestamp from a UUID v7.
 * UUID v7 encodes a 48-bit millisecond timestamp in the first 12 hex chars.
 * @param {string} id - UUID v7 string
 * @returns {Date}
 */
function extractTimestamp(id) {
  const hex = id.replace(/-/g, "");
  const timestampMs = parseInt(hex.substring(0, 12), 16);
  return new Date(timestampMs);
}

module.exports = { generateId, extractTimestamp };
