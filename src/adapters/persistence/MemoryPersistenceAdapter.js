"use strict";

const { PersistenceAdapter } = require("./PersistenceAdapter");

/**
 * In-memory persistence adapter. Useful for development and testing.
 * Data is lost on restart.
 */
class MemoryPersistenceAdapter extends PersistenceAdapter {
  constructor() {
    super();
    /** @type {Map<string, object[]>} channelId -> messages[] */
    this._messages = new Map();
    /** @type {Map<string, object>} groupId -> group */
    this._groups = new Map();
  }

  // ── Messages ──────────────────────────────────────────────────────

  async saveMessage(message) {
    const { channelId } = message;
    if (!this._messages.has(channelId)) {
      this._messages.set(channelId, []);
    }
    this._messages.get(channelId).push({ ...message });
  }

  async getMessages(channelId, opts = {}) {
    const all = this._messages.get(channelId) || [];
    let result = all;

    if (opts.before) {
      const idx = result.findIndex((m) => m.id === opts.before);
      if (idx > 0) result = result.slice(0, idx);
    }

    const limit = opts.limit || 50;
    return result.slice(-limit);
  }

  // ── Groups ────────────────────────────────────────────────────────

  async saveGroup(group) {
    this._groups.set(group.id, { ...group });
  }

  async getGroup(groupId) {
    return this._groups.get(groupId) || null;
  }

  async updateGroup(groupId, data) {
    const group = this._groups.get(groupId);
    if (!group) return;
    Object.assign(group, data);
  }

  async deleteGroup(groupId) {
    return this._groups.delete(groupId);
  }

  async addGroupMember(groupId, member) {
    const group = this._groups.get(groupId);
    if (!group) return;
    if (!group.members) group.members = [];
    const exists = group.members.find((m) => m.userId === member.userId);
    if (!exists) {
      group.members.push({ ...member });
    }
  }

  async removeGroupMember(groupId, userId) {
    const group = this._groups.get(groupId);
    if (!group || !group.members) return false;
    const before = group.members.length;
    group.members = group.members.filter((m) => m.userId !== userId);
    return group.members.length < before;
  }

  async getGroupsByUser(userId) {
    const result = [];
    for (const group of this._groups.values()) {
      if (group.members && group.members.some((m) => m.userId === userId)) {
        result.push({ ...group });
      }
    }
    return result;
  }

  async close() {
    this._messages.clear();
    this._groups.clear();
  }
}

module.exports = { MemoryPersistenceAdapter };
