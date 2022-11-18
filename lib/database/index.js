"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../logger");
const events_1 = require("events");
const redis_1 = require("redis");
class DatabaseManager {
    constructor() {
        this.mongoClient = null;
        this.redisClient = null;
        this.mongoTables = [];
        this.mongoCache = null;
        this.options = null;
    }
    /**
     * Return the mongoose client
     * @returns {mongoose.Connection | null}
     * @memberof DatabaseManager
     */
    get client() {
        return this.mongoClient;
    }
    /**
     * Sets the mongoose client
     * @param {mongoose.Connection | null} client
     * @private
     * @memberof DatabaseManager
     */
    set client(value) {
        this.mongoClient = value;
    }
    /**
     * Returns the existing mongoose tables
     * @returns {string[]}
     * @memberof DatabaseManager
     */
    get tables() {
        return this.mongoTables;
    }
    /**
     * Sets the mongoose tables
     * @param {string[]} tables
     * @private
     * @memberof DatabaseManager
     */
    set tables(value) {
        this.mongoTables = value;
    }
    /**
     * Returns the existing cache
     * @returns {Map<string, unknown> | RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null}
     * @memberof DatabaseManager
     */
    get cache() {
        return this.mongoCache;
    }
    /**
     * Sets the cache
     * @param {Map<string, unknown> | RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null} cache
     * @private
     * @memberof DatabaseManager
     */
    set cache(value) {
        this.mongoCache = value;
    }
    /**
     * Returns the redis client
     * @returns {RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null}
     * @memberof DatabaseManager
     */
    get redis() {
        return this.redisClient;
    }
    /**
     * Sets the redis client
     * @param {RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null} client
     * @private
     * @memberof DatabaseManager
     */
    set redis(value) {
        this.redisClient = value;
    }
    /**
     * Returns the redis client url
     * @returns {string}
     * @memberof DatabaseManager
     */
    get redisURL() {
        return this.redisClientURL;
    }
    /**
     * Sets the redis client url
     * @param {string} url
     * @private
     * @memberof DatabaseManager
     */
    set redisURL(url) {
        this.redisClientURL = url;
    }
    /**
     * It connects to a mongo database and sets up some listeners for the connection.
     * @returns The mongoClient object.
     */
    static initMongo(url, options, databaseOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (options && options.redis && options.redis.url) this.redisURL = options.redis.url;
                if (options && options.logs && options.logs.file) (0, logger_1.setLogFile)(options.logs.file);
                if (options && options.cache) this.enableCache();
                const mongo = mongoose_1.default;
                mongo.connection.on("error", (err) => {
                    if (err.code === "ECONNREFUSED") {
                        this.client = null;
                        this.events.emit("databaseDown", {
                            reason: "ECONNREFUSED - The database refused the connection.",
                            date: Date.now()
                        });
                    }
                    if (!options || (options.logs && options.logs.hidden !== true))
                        logger_1.logger.error(`Mongoose connection error: ${err.stack}`, {
                            label: "Database"
                        });
                });
                mongo.connection.on("disconnected", () => {
                    this.client = null;
                    this.events.emit("databaseDown", {
                        reason: "DISCONNECTED - The database disconnected.",
                        date: Date.now()
                    });
                    if (!options || (options.logs && options.logs.hidden !== true)) logger_1.logger.error(`Mongoose connection lost`, { label: "Database" });
                });
                mongo.connection.on("connected", () => {
                    this.client = mongo.connection;
                    this.events.emit("databaseUp", {
                        reason: "CONNECTED - The database connected.",
                        date: Date.now()
                    });
                    if (!options || (options.logs && options.logs.hidden !== true)) logger_1.logger.info(`Mongoose connection connected`, { label: "Database" });
                });
                mongo.connection.on("reconnected", () => {
                    this.client = mongo.connection;
                    this.events.emit("databaseUp", {
                        reason: "RECONNECTED - The database reconnected.",
                        date: Date.now()
                    });
                    if (!options || (options.logs && options.logs.hidden !== true)) logger_1.logger.info(`Mongoose connection reconnected`, { label: "Database" });
                });
                mongo.connection.on("reconnectFailed", () => {
                    this.client = null;
                    this.events.emit("databaseDown", {
                        reason: "RECONNECTFAILED - The database reconnect failed.",
                        date: Date.now()
                    });
                    if (!options || (options.logs && options.logs.hidden !== true))
                        logger_1.logger.info(`Mongoose connection failed to connect after the tries.`, {
                            label: "Database"
                        });
                });
                yield mongo.connect(
                    url,
                    databaseOptions || {
                        keepAlive: true,
                        minPoolSize: 3,
                        maxPoolSize: 10,
                        serverSelectionTimeoutMS: 10000,
                        socketTimeoutMS: 60000
                    }
                );
                this.options = options;
                return mongo.connection;
            } catch (err) {
                // eslint-disable-next-line no-console
                console.log(err);
                logger_1.logger.error("Error connecting to mongo database: " + err, {
                    label: "Database"
                });
                process.exit(1);
            }
        });
    }
    static enableCache() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.redisURL) {
                const client = (0, redis_1.createClient)({
                    url: this.redisURL
                });
                client.on("connect", () => {
                    this.events.emit("redisConnecting", {
                        reason: "CONNECTING - The redis server connecting.",
                        date: Date.now()
                    });
                    logger_1.logger.info(`Redis connection connecting`, { label: "Redis" });
                });
                client.on("ready", () => {
                    this.events.emit("redisConnected", {
                        reason: "CONNECTED - The redis server connected.",
                        date: Date.now()
                    });
                    logger_1.logger.info(`Redis connection connected`, { label: "Redis" });
                    this.cache = client;
                    this.redis = client;
                });
                client.on("end", () => {
                    this.events.emit("redisEnd", {
                        reason: "END - The redis server disconnected.",
                        date: Date.now()
                    });
                    logger_1.logger.error(`Redis connection disconnected using .disconnect() or .quit()`, {
                        label: "Redis"
                    });
                    this.cache = null;
                    this.redis = client;
                });
                client.on("error", (err) => {
                    if (this.cache) {
                        this.events.emit("redisError", {
                            reason: "ERROR - The redis server encountered an error. ERROR: " + err.message,
                            date: Date.now()
                        });
                        // eslint-disable-next-line no-console
                        console.log(err);
                        logger_1.logger.error(`Redis connection error`, {
                            label: "Redis"
                        });
                        this.cache = null;
                        this.redis = client;
                    }
                });
                client.on("reconnecting", () => {
                    if (this.cache) {
                        this.events.emit("redisReconnecting", {
                            reason: "RECONNECTING - The redis server reconnecting.",
                            date: Date.now()
                        });
                        logger_1.logger.error(`Redis connection lost, trying to reconnect...`, {
                            label: "Redis"
                        });
                        this.cache = null;
                        this.redis = client;
                    }
                });
                yield client.connect();
            } else if (!this.cache) this.cache = new Map();
            return true;
        });
    }
    /**
     * @info check if the cache is enabled from the specified options.
     * @param options The options to check.
     * @returns {boolean} true or false if the cache is enabled / disabled.
     */
    static isCacheEnabled(options) {
        var _a, _b, _c;
        return (options && ((_a = options === null || options === void 0 ? void 0 : options.cache) === null || _a === void 0 ? void 0 : _a.toggle) === true ? true : false)
            ? true
            : ((_b = this.options.cache) === null || _b === void 0 ? void 0 : _b.toggle) === true && (options ? ((_c = options === null || options === void 0 ? void 0 : options.cache) === null || _c === void 0 ? void 0 : _c.toggle) !== false : true)
            ? true
            : false;
    }
}
/**
 * The library events
 * @type {EventEmitter}
 * @static
 * @memberof DatabaseManager
 * @readonly
 */
DatabaseManager.events = new events_1.EventEmitter();
exports.default = DatabaseManager;
