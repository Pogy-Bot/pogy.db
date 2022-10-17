import mongoose from "mongoose";
import { logger, setLogFile } from "../logger";
import { Options } from "../types";
import { EventEmitter } from "events";
import {
  createClient,
  RedisClientType,
  RedisFunctions,
  RedisModules,
  RedisScripts,
} from "redis";

class DatabaseManager {
  public mongoClient: mongoose.Connection | null;
  public redisClient: RedisClientType<
    RedisModules,
    RedisFunctions,
    RedisScripts
  > | null;
  public mongoTables: string[];
  public mongoCache:
    | Map<string, any>
    | RedisClientType<RedisModules, RedisFunctions, RedisScripts>
    | null;
  static cache:
    | Map<string, any>
    | RedisClientType<RedisModules, RedisFunctions, RedisScripts>
    | any;
  public redisClientURL: string | null;
  static client: mongoose.Connection | null;
  static redis:
    | RedisClientType<RedisModules, RedisFunctions, RedisScripts>
    | any;
  static tables: string[];
  static events = new EventEmitter();
  static redisURL: string;

  constructor() {
    this.mongoClient = null;
    this.redisClient = null;
    this.mongoTables = [];
    this.mongoCache = null;
  }

  get client() {
    return this.mongoClient;
  }

  set client(value) {
    this.mongoClient = value;
  }

  get tables() {
    return this.mongoTables;
  }

  set tables(value) {
    this.mongoTables = value;
  }

  get cache() {
    return this.mongoCache;
  }

  set cache(value) {
    this.mongoCache = value;
  }

  get redis() {
    return this.redisClient;
  }

  set redis(value) {
    this.redisClient = value;
  }

  get redisURL() {
    return this.redisClientURL;
  }

  set redisURL(url: string) {
    this.redisClientURL = url;
  }

  /**
   * It connects to a mongo database and sets up some listeners for the connection.
   * @returns The mongoClient object.
   */
  static async initMongo(
    url: string,
    options?: Options,
    databaseOptions?: mongoose.ConnectOptions
  ) {
    try {
      if (options && options.redis && options.redis.url)
        this.redisURL = options.redis.url;
      if (options && options.logFile) setLogFile(options.logFile);
      if (options && options.cache) this.enableCache();
      const mongo = mongoose;

      mongo.connection.on("error", (err) => {
        if (err.code === "ECONNREFUSED") {
          this.client = null;
          this.events.emit("databaseDown", {
            reason: "ECONNREFUSED - The database refused the connection.",
            date: Date.now(),
          });
        }
        if (!options || !options.hidelogs)
          logger.error(`Mongoose connection error: ${err.stack}`, {
            label: "Database",
          });
      });

      mongo.connection.on("disconnected", () => {
        this.client = null;
        this.events.emit("databaseDown", {
          reason: "DISCONNECTED - The database disconnected.",
          date: Date.now(),
        });
        if (!options || !options.hidelogs)
          logger.error(`Mongoose connection lost`, { label: "Database" });
      });

      mongo.connection.on("connected", () => {
        this.client = mongo.connection;
        this.events.emit("databaseUp", {
          reason: "CONNECTED - The database connected.",
          date: Date.now(),
        });
        if (!options || !options.hidelogs)
          logger.info(`Mongoose connection connected`, { label: "Database" });
      });

      mongo.connection.on("reconnected", () => {
        this.client = mongo.connection;
        this.events.emit("databaseUp", {
          reason: "RECONNECTED - The database reconnected.",
          date: Date.now(),
        });
        if (!options || !options.hidelogs)
          logger.info(`Mongoose connection reconnected`, { label: "Database" });
      });

      mongo.connection.on("reconnectFailed", () => {
        this.client = null;
        this.events.emit("databaseDown", {
          reason: "RECONNECTFAILED - The database reconnect failed.",
          date: Date.now(),
        });
        if (!options || !options.hidelogs)
          logger.info(
            `Mongoose connection failed to connect after the tries.`,
            {
              label: "Database",
            }
          );
      });

      await mongo.connect(
        url,
        databaseOptions || {
          keepAlive: true,
          minPoolSize: 3,
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 10000,
          socketTimeoutMS: 60000,
        }
      );

      return mongo.connection;
    } catch (err) {
      console.log(err);
      logger.error("Error connecting to mongo database: " + err, {
        label: "Database",
      });
      process.exit(1);
    }
  }

  static async enableCache() {
    if (this.redisURL) {
      const client = createClient({
        url: this.redisURL,
      });

      client.on("connect", () => {
        this.events.emit("redisConnecting", {
          reason: "CONNECTING - The redis server connecting.",
          date: Date.now(),
        });
        logger.info(`Redis connection connecting`, { label: "Redis" });
      });
      client.on("ready", () => {
        this.events.emit("redisConnected", {
          reason: "CONNECTED - The redis server connected.",
          date: Date.now(),
        });
        logger.info(`Redis connection connected`, { label: "Redis" });
        this.cache = client;
        this.redis = client;
      });
      client.on("end", () => {
        this.events.emit("redisEnd", {
          reason: "END - The redis server disconnected.",
          date: Date.now(),
        });
        logger.error(
          `Redis connection disconnected using .disconnect() or .quit()`,
          {
            label: "Redis",
          }
        );
        this.cache = null;
        this.redis = client;
      });
      client.on("error", (err) => {
        if (this.cache) {
          this.events.emit("redisError", {
            reason:
              "ERROR - The redis server encountered an error. ERROR: " +
              err.message,
            date: Date.now(),
          });
          console.log(err);
          logger.error(`Redis connection error`, {
            label: "Redis",
          });
          this.cache = null;
          this.redis = client;
        }
      });
      client.on("reconnecting", () => {
        if (this.cache) {
          this.events.emit("redisReconnecting", {
            reason: "RECONNECTING - The redis server reconnecting.",
            date: Date.now(),
          });
          logger.error(`Redis connection lost, trying to reconnect...`, {
            label: "Redis",
          });
          this.cache = null;
          this.redis = client;
        }
      });

      await client.connect();
    } else if (!this.cache) this.cache = new Map();
    return true;
  }
}

export default DatabaseManager;
