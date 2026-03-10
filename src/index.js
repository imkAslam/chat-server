"use strict";

const { ChatServer } = require("./core/ChatServer");
const { EventBus } = require("./core/EventBus");
const { EVENTS, INTERNAL_EVENTS, QUEUE_CHANNELS, GROUP_ROLES } = require("./core/constants");

// Adapters
const { CacheAdapter } = require("./adapters/cache/CacheAdapter");
const { MemoryCacheAdapter } = require("./adapters/cache/MemoryCacheAdapter");
const { RedisCacheAdapter } = require("./adapters/cache/RedisCacheAdapter");
const { PersistenceAdapter } = require("./adapters/persistence/PersistenceAdapter");
const { MemoryPersistenceAdapter } = require("./adapters/persistence/MemoryPersistenceAdapter");
const { QueueAdapter } = require("./adapters/queue/QueueAdapter");
const { MemoryQueueAdapter } = require("./adapters/queue/MemoryQueueAdapter");
const { RedisQueueAdapter } = require("./adapters/queue/RedisQueueAdapter");

// Encryption
const { EncryptionService } = require("./encryption/EncryptionService");

// Utils
const { generateId, extractTimestamp } = require("./utils/uuid");
const { Logger } = require("./utils/logger");

// Errors
const {
  ChatServerError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  RateLimitError,
  EncryptionError,
  AdapterError,
} = require("./utils/errors");

module.exports = {
  ChatServer,
  EventBus,

  // Constants
  EVENTS,
  INTERNAL_EVENTS,
  QUEUE_CHANNELS,
  GROUP_ROLES,

  // Adapters
  CacheAdapter,
  MemoryCacheAdapter,
  RedisCacheAdapter,
  PersistenceAdapter,
  MemoryPersistenceAdapter,
  QueueAdapter,
  MemoryQueueAdapter,
  RedisQueueAdapter,

  // Encryption
  EncryptionService,

  // Utils
  generateId,
  extractTimestamp,
  Logger,

  // Errors
  ChatServerError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  RateLimitError,
  EncryptionError,
  AdapterError,
};
