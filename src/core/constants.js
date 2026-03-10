"use strict";

/** Socket.IO event names, namespaced by channel. */
const EVENTS = {
  // Direct messaging
  DM_SEND: "dm:send",
  DM_RECEIVED: "dm:received",
  DM_TYPING: "dm:typing",
  DM_READ: "dm:read",

  // Ephemeral rooms
  ROOM_JOIN: "room:join",
  ROOM_LEAVE: "room:leave",
  ROOM_MESSAGE: "room:message",
  ROOM_MEMBERS: "room:members",

  // Persistent groups
  GROUP_CREATE: "group:create",
  GROUP_JOIN: "group:join",
  GROUP_LEAVE: "group:leave",
  GROUP_MESSAGE: "group:message",
  GROUP_MEMBERS: "group:members",
  GROUP_INVITE: "group:invite",
  GROUP_KICK: "group:kick",
  GROUP_CREATED: "group:created",
  GROUP_JOINED: "group:joined",
  GROUP_LEFT: "group:left",
  GROUP_INVITED: "group:invited",
  GROUP_KICKED: "group:kicked",

  // Notifications
  NOTIFICATION_SEND: "notification:send",
  NOTIFICATION_BROADCAST: "notification:broadcast",
  NOTIFICATION_RECEIVED: "notification:received",

  // System
  CONNECTION: "connection",
  DISCONNECT: "disconnect",
  ERROR: "error",
  CONNECT_ERROR: "connect_error",
};

/** Internal event bus topics. */
const INTERNAL_EVENTS = {
  USER_CONNECTED: "internal:user:connected",
  USER_DISCONNECTED: "internal:user:disconnected",
  MESSAGE_SENT: "internal:message:sent",
  MESSAGE_DELIVERED: "internal:message:delivered",
  GROUP_UPDATED: "internal:group:updated",
  NOTIFICATION_QUEUED: "internal:notification:queued",
};

/** Queue channel names. */
const QUEUE_CHANNELS = {
  DM: "queue:dm",
  ROOM: "queue:room",
  GROUP: "queue:group",
  NOTIFICATION: "queue:notification",
};

/** Group member roles. */
const GROUP_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
};

module.exports = { EVENTS, INTERNAL_EVENTS, QUEUE_CHANNELS, GROUP_ROLES };
