"use strict";

const { BaseChannel } = require("./BaseChannel");
const { EVENTS, QUEUE_CHANNELS } = require("../core/constants");
const { withValidation } = require("../middleware/validation");

const JOIN_SCHEMA = {
  room: { type: "string", required: true, maxLength: 128 },
  name: { type: "string", required: true, maxLength: 64 },
};

const LEAVE_SCHEMA = {
  room: { type: "string", required: true, maxLength: 128 },
};

const MESSAGE_SCHEMA = {
  room: { type: "string", required: true, maxLength: 128 },
  content: { type: "string", required: true, maxLength: 8192 },
};

const MEMBERS_SCHEMA = {
  room: { type: "string", required: true, maxLength: 128 },
};

/**
 * Ephemeral room chat channel.
 * Rooms have no persistence — join/leave freely, no stored history, no membership.
 *
 * Events:
 *  - room:join     { room, name }       -> room:message (join announcement)
 *  - room:leave    { room }             -> room:message (leave announcement)
 *  - room:message  { room, content }    -> room:message to all room members
 *  - room:members  { room }             -> room:members with list of member socket IDs
 */
class RoomChat extends BaseChannel {
  constructor(services) {
    super(services);
    /**
     * Track which rooms each socket is in, and their display name,
     * so we can clean up on disconnect.
     * @type {Map<string, Map<string, string>>} socketId -> Map<room, name>
     */
    this._socketRooms = new Map();
  }

  /**
   * @param {import("socket.io").Server} io
   * @param {import("socket.io").Socket} socket
   */
  register(io, socket) {
    socket.on(
      EVENTS.ROOM_JOIN,
      withValidation(JOIN_SCHEMA, async (_sock, data) => {
        await this._handleJoin(io, socket, data);
      }).bind(socket),
    );

    socket.on(
      EVENTS.ROOM_LEAVE,
      withValidation(LEAVE_SCHEMA, async (_sock, data) => {
        await this._handleLeave(io, socket, data);
      }).bind(socket),
    );

    socket.on(
      EVENTS.ROOM_MESSAGE,
      withValidation(MESSAGE_SCHEMA, async (_sock, data) => {
        await this._handleMessage(io, socket, data);
      }, this.config.maxMessageSize).bind(socket),
    );

    socket.on(
      EVENTS.ROOM_MEMBERS,
      withValidation(MEMBERS_SCHEMA, async (_sock, data) => {
        await this._handleMembers(io, socket, data);
      }).bind(socket),
    );
  }

  /** @param {import("socket.io").Socket} socket */
  async onDisconnect(socket) {
    const rooms = this._socketRooms.get(socket.id);
    if (!rooms) return;

    for (const [room, name] of rooms.entries()) {
      socket.to(room).emit(EVENTS.ROOM_MESSAGE, {
        id: this.generateId(),
        room,
        system: true,
        content: `${name} disconnected`,
        timestamp: new Date().toISOString(),
      });
    }

    this._socketRooms.delete(socket.id);
  }

  /** @private */
  async _handleJoin(io, socket, data) {
    const { room, name } = data;

    socket.join(room);

    if (!this._socketRooms.has(socket.id)) {
      this._socketRooms.set(socket.id, new Map());
    }
    this._socketRooms.get(socket.id).set(room, name);

    socket.to(room).emit(EVENTS.ROOM_MESSAGE, {
      id: this.generateId(),
      room,
      system: true,
      content: `${name} joined ${room}`,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`Room: ${name} joined ${room}`);
  }

  /** @private */
  async _handleLeave(io, socket, data) {
    const { room } = data;
    const rooms = this._socketRooms.get(socket.id);
    const name = rooms?.get(room) || "Unknown";

    socket.leave(room);
    rooms?.delete(room);

    socket.to(room).emit(EVENTS.ROOM_MESSAGE, {
      id: this.generateId(),
      room,
      system: true,
      content: `${name} left ${room}`,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`Room: ${name} left ${room}`);
  }

  /** @private */
  async _handleMessage(io, socket, data) {
    const { room, content } = data;
    const rooms = this._socketRooms.get(socket.id);
    const name = rooms?.get(room) || "Unknown";

    const message = {
      id: this.generateId(),
      room,
      senderId: socket.id,
      senderName: name,
      content,
      timestamp: new Date().toISOString(),
    };

    await this.queue.publish(QUEUE_CHANNELS.ROOM, { type: "message", message });

    socket.to(room).emit(EVENTS.ROOM_MESSAGE, message);
    socket.emit(EVENTS.ROOM_MESSAGE, { ...message, self: true });
  }

  /** @private */
  async _handleMembers(io, socket, data) {
    const { room } = data;
    const sockets = await io.in(room).fetchSockets();
    const members = sockets.map((s) => {
      const rooms = this._socketRooms.get(s.id);
      return { socketId: s.id, name: rooms?.get(room) || "Unknown" };
    });
    socket.emit(EVENTS.ROOM_MEMBERS, { room, members });
  }
}

module.exports = { RoomChat };
