"use strict";

const { AdapterError } = require("../../utils/errors");

/**
 * Base persistence adapter interface.
 * All custom persistence adapters must extend this class.
 */
class PersistenceAdapter {
  // ── Messages ──────────────────────────────────────────────────────

  /**
   * @param {object} message - { id, channelId, channelType, senderId, content, timestamp }
   * @returns {Promise<void>}
   */
  async saveMessage(_message) {
    throw new AdapterError("PersistenceAdapter.saveMessage() not implemented");
  }

  /**
   * @param {string} _channelId
   * @param {{ limit?: number, before?: string }} [_opts] - `before` is a message ID for cursor pagination.
   * @returns {Promise<object[]>}
   */
  async getMessages(_channelId, _opts) {
    throw new AdapterError("PersistenceAdapter.getMessages() not implemented");
  }

  // ── Groups ────────────────────────────────────────────────────────

  /**
   * @param {object} group - { id, name, ownerId, members: [{ userId, role }], createdAt }
   * @returns {Promise<void>}
   */
  async saveGroup(_group) {
    throw new AdapterError("PersistenceAdapter.saveGroup() not implemented");
  }

  /**
   * @param {string} _groupId
   * @returns {Promise<object | null>}
   */
  async getGroup(_groupId) {
    throw new AdapterError("PersistenceAdapter.getGroup() not implemented");
  }

  /**
   * @param {string} _groupId
   * @param {object} _data - Partial group fields to merge.
   * @returns {Promise<void>}
   */
  async updateGroup(_groupId, _data) {
    throw new AdapterError("PersistenceAdapter.updateGroup() not implemented");
  }

  /** @param {string} _groupId @returns {Promise<boolean>} */
  async deleteGroup(_groupId) {
    throw new AdapterError("PersistenceAdapter.deleteGroup() not implemented");
  }

  /**
   * @param {string} _groupId
   * @param {{ userId: string, role: string }} _member
   * @returns {Promise<void>}
   */
  async addGroupMember(_groupId, _member) {
    throw new AdapterError("PersistenceAdapter.addGroupMember() not implemented");
  }

  /**
   * @param {string} _groupId
   * @param {string} _userId
   * @returns {Promise<boolean>}
   */
  async removeGroupMember(_groupId, _userId) {
    throw new AdapterError("PersistenceAdapter.removeGroupMember() not implemented");
  }

  /**
   * @param {string} _userId
   * @returns {Promise<object[]>} Groups the user belongs to.
   */
  async getGroupsByUser(_userId) {
    throw new AdapterError("PersistenceAdapter.getGroupsByUser() not implemented");
  }

  // ── Lifecycle ─────────────────────────────────────────────────────

  /** @returns {Promise<void>} */
  async close() {}
}

module.exports = { PersistenceAdapter };
