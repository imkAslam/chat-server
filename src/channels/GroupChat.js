"use strict";

const { BaseChannel } = require("./BaseChannel");
const { EVENTS, INTERNAL_EVENTS, QUEUE_CHANNELS, GROUP_ROLES } = require("../core/constants");
const { withValidation } = require("../middleware/validation");


const CREATE_SCHEMA = {
  name: { type: "string", required: true, maxLength: 128 },
};

const GROUP_ID_SCHEMA = {
  groupId: { type: "string", required: true, maxLength: 64 },
};

const MESSAGE_SCHEMA = {
  groupId: { type: "string", required: true, maxLength: 64 },
  content: { type: "string", required: true, maxLength: 8192 },
};

const INVITE_SCHEMA = {
  groupId: { type: "string", required: true, maxLength: 64 },
  userId: { type: "string", required: true, maxLength: 256 },
};

const KICK_SCHEMA = {
  groupId: { type: "string", required: true, maxLength: 64 },
  userId: { type: "string", required: true, maxLength: 256 },
};

/**
 * Persistent group chat channel.
 * Groups have stored membership, roles (owner/admin/member), and message history.
 *
 * Events:
 *  - group:create   { name }                -> group:created
 *  - group:join     { groupId }             -> group:joined
 *  - group:leave    { groupId }             -> group:left
 *  - group:message  { groupId, content }    -> group:message to all group members
 *  - group:members  { groupId }             -> group:members
 *  - group:invite   { groupId, userId }     -> group:invited (admin+ only)
 *  - group:kick     { groupId, userId }     -> group:kicked  (admin+ only)
 */
class GroupChat extends BaseChannel {
  /**
   * @param {import("socket.io").Server} io
   * @param {import("socket.io").Socket} socket
   */
  register(io, socket) {
    const userId = this._getUserId(socket);

    socket.on(
      EVENTS.GROUP_CREATE,
      withValidation(CREATE_SCHEMA, async (_s, data) => {
        await this._handleCreate(io, socket, userId, data);
      }).bind(socket),
    );

    socket.on(
      EVENTS.GROUP_JOIN,
      withValidation(GROUP_ID_SCHEMA, async (_s, data) => {
        await this._handleJoin(io, socket, userId, data);
      }).bind(socket),
    );

    socket.on(
      EVENTS.GROUP_LEAVE,
      withValidation(GROUP_ID_SCHEMA, async (_s, data) => {
        await this._handleLeave(io, socket, userId, data);
      }).bind(socket),
    );

    socket.on(
      EVENTS.GROUP_MESSAGE,
      withValidation(MESSAGE_SCHEMA, async (_s, data) => {
        await this._handleMessage(io, socket, userId, data);
      }, this.config.maxMessageSize).bind(socket),
    );

    socket.on(
      EVENTS.GROUP_MEMBERS,
      withValidation(GROUP_ID_SCHEMA, async (_s, data) => {
        await this._handleMembers(socket, data);
      }).bind(socket),
    );

    socket.on(
      EVENTS.GROUP_INVITE,
      withValidation(INVITE_SCHEMA, async (_s, data) => {
        await this._handleInvite(io, socket, userId, data);
      }).bind(socket),
    );

    socket.on(
      EVENTS.GROUP_KICK,
      withValidation(KICK_SCHEMA, async (_s, data) => {
        await this._handleKick(io, socket, userId, data);
      }).bind(socket),
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────

  /** @private */
  async _handleCreate(io, socket, userId, data) {
    const group = {
      id: this.generateId(),
      name: data.name,
      ownerId: userId,
      members: [{ userId, role: GROUP_ROLES.OWNER }],
      createdAt: new Date().toISOString(),
    };

    await this.persistence.saveGroup(group);

    const roomKey = this._roomKey(group.id);
    socket.join(roomKey);

    socket.emit(EVENTS.GROUP_CREATED, { group });
    this.eventBus.emit(INTERNAL_EVENTS.GROUP_UPDATED, { action: "created", group });
    this.logger.info(`Group: "${group.name}" created by ${userId}`);
  }

  /** @private */
  async _handleJoin(io, socket, userId, data) {
    const group = await this.persistence.getGroup(data.groupId);
    if (!group) {
      socket.emit(EVENTS.ERROR, { code: "GROUP_NOT_FOUND", message: "Group not found" });
      return;
    }

    const alreadyMember = group.members?.some((m) => m.userId === userId);
    if (alreadyMember) {
      socket.join(this._roomKey(group.id));
      socket.emit(EVENTS.GROUP_JOINED, { groupId: group.id });
      return;
    }

    await this.persistence.addGroupMember(group.id, { userId, role: GROUP_ROLES.MEMBER });

    const roomKey = this._roomKey(group.id);
    socket.join(roomKey);

    socket.emit(EVENTS.GROUP_JOINED, { groupId: group.id });
    socket.to(roomKey).emit(EVENTS.GROUP_MESSAGE, {
      id: this.generateId(),
      groupId: group.id,
      system: true,
      content: `${userId} joined the group`,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`Group: ${userId} joined ${group.id}`);
  }

  /** @private */
  async _handleLeave(io, socket, userId, data) {
    const group = await this.persistence.getGroup(data.groupId);
    if (!group) return;

    await this.persistence.removeGroupMember(group.id, userId);

    const roomKey = this._roomKey(group.id);
    socket.leave(roomKey);

    socket.emit(EVENTS.GROUP_LEFT, { groupId: group.id });
    socket.to(roomKey).emit(EVENTS.GROUP_MESSAGE, {
      id: this.generateId(),
      groupId: group.id,
      system: true,
      content: `${userId} left the group`,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`Group: ${userId} left ${group.id}`);
  }

  /** @private */
  async _handleMessage(io, socket, userId, data) {
    const group = await this.persistence.getGroup(data.groupId);
    if (!group) {
      socket.emit(EVENTS.ERROR, { code: "GROUP_NOT_FOUND", message: "Group not found" });
      return;
    }

    const isMember = group.members?.some((m) => m.userId === userId);
    if (!isMember) {
      socket.emit(EVENTS.ERROR, { code: "NOT_A_MEMBER", message: "You are not a member of this group" });
      return;
    }

    const message = {
      id: this.generateId(),
      channelId: data.groupId,
      channelType: "group",
      groupId: data.groupId,
      senderId: userId,
      content: this.encryptContent(data.content),
      timestamp: new Date().toISOString(),
    };

    await this.persistence.saveMessage(message);
    await this.queue.publish(QUEUE_CHANNELS.GROUP, { type: "message", message });

    const outgoing = {
      id: message.id,
      groupId: data.groupId,
      senderId: userId,
      content: data.content,
      timestamp: message.timestamp,
    };

    const roomKey = this._roomKey(data.groupId);
    socket.to(roomKey).emit(EVENTS.GROUP_MESSAGE, outgoing);
    socket.emit(EVENTS.GROUP_MESSAGE, { ...outgoing, self: true });

    this.eventBus.emit(INTERNAL_EVENTS.MESSAGE_SENT, message);
  }

  /** @private */
  async _handleMembers(socket, data) {
    const group = await this.persistence.getGroup(data.groupId);
    if (!group) {
      socket.emit(EVENTS.ERROR, { code: "GROUP_NOT_FOUND", message: "Group not found" });
      return;
    }
    socket.emit(EVENTS.GROUP_MEMBERS, { groupId: group.id, members: group.members || [] });
  }

  /** @private */
  async _handleInvite(io, socket, userId, data) {
    const allowed = await this._requireRole(socket, data.groupId, userId, [GROUP_ROLES.OWNER, GROUP_ROLES.ADMIN]);
    if (!allowed) return;

    await this.persistence.addGroupMember(data.groupId, {
      userId: data.userId,
      role: GROUP_ROLES.MEMBER,
    });

    const inviteeSocketId = await this.cache.get(`user:${data.userId}`);
    if (inviteeSocketId) {
      io.to(inviteeSocketId).emit(EVENTS.GROUP_INVITED, { groupId: data.groupId, invitedBy: userId });
    }

    const roomKey = this._roomKey(data.groupId);
    io.to(roomKey).emit(EVENTS.GROUP_MESSAGE, {
      id: this.generateId(),
      groupId: data.groupId,
      system: true,
      content: `${data.userId} was invited by ${userId}`,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`Group: ${userId} invited ${data.userId} to ${data.groupId}`);
  }

  /** @private */
  async _handleKick(io, socket, userId, data) {
    const allowed = await this._requireRole(socket, data.groupId, userId, [GROUP_ROLES.OWNER, GROUP_ROLES.ADMIN]);
    if (!allowed) return;

    if (data.userId === userId) {
      socket.emit(EVENTS.ERROR, { code: "CANNOT_KICK_SELF", message: "Cannot kick yourself" });
      return;
    }

    await this.persistence.removeGroupMember(data.groupId, data.userId);

    const kickedSocketId = await this.cache.get(`user:${data.userId}`);
    if (kickedSocketId) {
      const kickedSocket = io.sockets.sockets.get(kickedSocketId);
      if (kickedSocket) {
        kickedSocket.leave(this._roomKey(data.groupId));
      }
      io.to(kickedSocketId).emit(EVENTS.GROUP_KICKED, { groupId: data.groupId, kickedBy: userId });
    }

    const roomKey = this._roomKey(data.groupId);
    io.to(roomKey).emit(EVENTS.GROUP_MESSAGE, {
      id: this.generateId(),
      groupId: data.groupId,
      system: true,
      content: `${data.userId} was removed by ${userId}`,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`Group: ${userId} kicked ${data.userId} from ${data.groupId}`);
  }

  // ── Helpers ───────────────────────────────────────────────────────

  /**
   * Returns `true` if the user holds one of the allowed roles, `false` otherwise.
   * On failure an error event is emitted to the socket so the caller can simply `return`.
   * @private
   */
  async _requireRole(socket, groupId, userId, allowedRoles) {
    const group = await this.persistence.getGroup(groupId);
    if (!group) {
      socket.emit(EVENTS.ERROR, { code: "GROUP_NOT_FOUND", message: "Group not found" });
      return false;
    }
    const member = group.members?.find((m) => m.userId === userId);
    if (!member || !allowedRoles.includes(member.role)) {
      socket.emit(EVENTS.ERROR, { code: "FORBIDDEN", message: "Insufficient permissions" });
      return false;
    }
    return true;
  }

  /** @private */
  _roomKey(groupId) {
    return `group:${groupId}`;
  }

  /** @private */
  _getUserId(socket) {
    return socket.user?.id || socket.user?.sub || socket.handshake.auth?.userId || socket.id;
  }
}

module.exports = { GroupChat };
