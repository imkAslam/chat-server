"use strict";

const crypto = require("crypto");
const { EncryptionError } = require("../utils/errors");

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * AES-256-GCM payload encryption service.
 * Uses Node.js built-in crypto — zero external dependencies.
 */
class EncryptionService {
  /**
   * @param {{ secret: string, salt?: string }} config
   */
  constructor(config) {
    if (!config.secret) {
      throw new EncryptionError("Encryption secret is required");
    }
    const salt = config.salt || "chat-server-default-salt";
    this._key = crypto.scryptSync(config.secret, salt, KEY_LENGTH);
  }

  /**
   * Encrypt a plaintext string.
   * @param {string} plaintext
   * @returns {{ encrypted: string, iv: string, authTag: string }}
   */
  encrypt(plaintext) {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, this._key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
      });

      let encrypted = cipher.update(plaintext, "utf8", "hex");
      encrypted += cipher.final("hex");
      const authTag = cipher.getAuthTag().toString("hex");

      return {
        encrypted,
        iv: iv.toString("hex"),
        authTag,
      };
    } catch (err) {
      throw new EncryptionError(`Encryption failed: ${err.message}`);
    }
  }

  /**
   * Decrypt a previously encrypted payload.
   * @param {{ encrypted: string, iv: string, authTag: string }} payload
   * @returns {string} The original plaintext.
   */
  decrypt(payload) {
    try {
      const { encrypted, iv, authTag } = payload;
      const decipher = crypto.createDecipheriv(
        ALGORITHM,
        this._key,
        Buffer.from(iv, "hex"),
        { authTagLength: AUTH_TAG_LENGTH },
      );
      decipher.setAuthTag(Buffer.from(authTag, "hex"));

      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (err) {
      throw new EncryptionError(`Decryption failed: ${err.message}`);
    }
  }

  /**
   * Encrypt a JS object (serialized to JSON).
   * @param {object} obj
   * @returns {{ encrypted: string, iv: string, authTag: string }}
   */
  encryptObject(obj) {
    return this.encrypt(JSON.stringify(obj));
  }

  /**
   * Decrypt back to a JS object.
   * @param {{ encrypted: string, iv: string, authTag: string }} payload
   * @returns {object}
   */
  decryptObject(payload) {
    return JSON.parse(this.decrypt(payload));
  }
}

module.exports = { EncryptionService };
