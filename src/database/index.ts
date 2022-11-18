/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";
import { logger, setLogFile } from "../logger";
import { Options } from "../types";
import { EventEmitter } from "events";
import { createClient, RedisClientType, RedisFunctions, RedisModules, RedisScripts } from "redis";

class DatabaseManager {
    /**
     * The mongoose client (the connection)
     * @type {mongoose.Connection | null}
     * @private
     * @memberof DatabaseManager
     */
    private mongoClient: mongoose.Connection | null;
    /**
     * The redis client
     * @type {RedisClientType}
     * @private
     * @memberof DatabaseManager
     */
    private redisClient: RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null;
    /**
     * The database tables
     * @type {string[]}
     * @private
     * @memberof DatabaseManager
     */
    private mongoTables: string[];
    /**
     * The mongooseCache which can be memory (Maps) or redis
     * @type {Map<string, unknown> | RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null}
     * @private
     * @memberof DatabaseManager
     */
    private mongoCache: Map<string, unknown> | RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null;
    /**
     * The redis client url
     * @type {string | null}
     * @private
     * @memberof DatabaseManager
     */
    private redisClientURL: string | null;
    /**
     * The database options
     * @type {Options}
     * @memberof DatabaseManager
     * @private
     * @readonly
     */
    private readonly options: Options | null;
    /**
     * The cache
     * @type {Map<string, unknown> | RedisClientType<RedisModules, RedisFunctions, RedisScripts> | any}
     * @static
     * @memberof DatabaseManager
     */
    static cache: Map<string, unknown> | RedisClientType<RedisModules, RedisFunctions, RedisScripts> | any;
    /**
     * The actual mongoose current connection
     * @type {mongoose.Connection | null}
     * @static
     * @memberof DatabaseManager
     */
    static client: mongoose.Connection | null;
    /**
     * The redis client
     * @type {RedisClientType}
     * @static
     * @memberof DatabaseManager
     */
    /**
     * The actual redis client
     * @type {RedisClientType<RedisModules, RedisFunctions, RedisScripts> | any}
     * @static
     * @memberof DatabaseManager
     */
    static redis: RedisClientType<RedisModules, RedisFunctions, RedisScripts> | any;
    /**
     * The database tables
     * @type {string[]}
     * @static
     * @memberof DatabaseManager
     */
    static tables: string[];
    /**
     * The library events
     * @type {EventEmitter}
     * @static
     * @memberof DatabaseManager
     * @readonly
     */
    static readonly events: EventEmitter = new EventEmitter();
    /**
     * the redisURL
     * @type {string}
     * @static
     * @memberof DatabaseManager
     */
    static redisURL: string;
    /**
     * The selected options
     * @type {Options}
     * @static
     * @memberof DatabaseManager
     */
    static options: Options;

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
    get client(): mongoose.Connection | null {
        return this.mongoClient;
    }

    /**
     * Sets the mongoose client
     * @param {mongoose.Connection | null} client
     * @private
     * @memberof DatabaseManager
     */
    private set client(value: mongoose.Connection | null) {
        this.mongoClient = value;
    }

    /**
     * Returns the existing mongoose tables
     * @returns {string[]}
     * @memberof DatabaseManager
     */
    get tables(): string[] {
        return this.mongoTables;
    }

    /**
     * Sets the mongoose tables
     * @param {string[]} tables
     * @private
     * @memberof DatabaseManager
     */
    private set tables(value) {
        this.mongoTables = value;
    }

    /**
     * Returns the existing cache
     * @returns {Map<string, unknown> | RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null}
     * @memberof DatabaseManager
     */
    get cache(): Map<string, unknown> | RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null {
        return this.mongoCache;
    }

    /**
     * Sets the cache
     * @param {Map<string, unknown> | RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null} cache
     * @private
     * @memberof DatabaseManager
     */
    private set cache(value) {
        this.mongoCache = value;
    }

    /**
     * Returns the redis client
     * @returns {RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null}
     * @memberof DatabaseManager
     */
    get redis(): RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null {
        return this.redisClient;
    }

    /**
     * Sets the redis client
     * @param {RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null} client
     * @private
     * @memberof DatabaseManager
     */
    private set redis(value) {
        this.redisClient = value;
    }

    /**
     * Returns the redis client url
     * @returns {string}
     * @memberof DatabaseManager
     */
    get redisURL(): string {
        return this.redisClientURL;
    }

    /**
     * Sets the redis client url
     * @param {string} url
     * @private
     * @memberof DatabaseManager
     */
    private set redisURL(url: string) {
        this.redisClientURL = url;
    }

    /**
     * It connects to a mongo database and sets up some listeners for the connection.
     * @returns The mongoClient object.
     */
    static async initMongo(url: string, options?: Options, databaseOptions?: mongoose.ConnectOptions) {
        try {
            if (options && options.redis && options.redis.url) this.redisURL = options.redis.url;
            if (options && options.logs && options.logs.file) setLogFile(options.logs.file);
            if (options && options.cache) this.enableCache();
            const mongo = mongoose;

            mongo.connection.on("error", (err) => {
                if (err.code === "ECONNREFUSED") {
                    this.client = null;
                    this.events.emit("databaseDown", {
                        reason: "ECONNREFUSED - The database refused the connection.",
                        date: Date.now()
                    });
                }
                if (!options || (options.logs && options.logs.hidden !== true))
                    logger.error(`Mongoose connection error: ${err.stack}`, {
                        label: "Database"
                    });
            });

            mongo.connection.on("disconnected", () => {
                this.client = null;
                this.events.emit("databaseDown", {
                    reason: "DISCONNECTED - The database disconnected.",
                    date: Date.now()
                });
                if (!options || (options.logs && options.logs.hidden !== true)) logger.error(`Mongoose connection lost`, { label: "Database" });
            });

            mongo.connection.on("connected", () => {
                this.client = mongo.connection;
                this.events.emit("databaseUp", {
                    reason: "CONNECTED - The database connected.",
                    date: Date.now()
                });
                if (!options || (options.logs && options.logs.hidden !== true)) logger.info(`Mongoose connection connected`, { label: "Database" });
            });

            mongo.connection.on("reconnected", () => {
                this.client = mongo.connection;
                this.events.emit("databaseUp", {
                    reason: "RECONNECTED - The database reconnected.",
                    date: Date.now()
                });
                if (!options || (options.logs && options.logs.hidden !== true)) logger.info(`Mongoose connection reconnected`, { label: "Database" });
            });

            mongo.connection.on("reconnectFailed", () => {
                this.client = null;
                this.events.emit("databaseDown", {
                    reason: "RECONNECTFAILED - The database reconnect failed.",
                    date: Date.now()
                });
                if (!options || (options.logs && options.logs.hidden !== true))
                    logger.info(`Mongoose connection failed to connect after the tries.`, {
                        label: "Database"
                    });
            });

            await mongo.connect(
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
            logger.error("Error connecting to mongo database: " + err, {
                label: "Database"
            });
            process.exit(1);
        }
    }

    static async enableCache() {
        if (this.redisURL) {
            const client = createClient({
                url: this.redisURL
            });

            client.on("connect", () => {
                this.events.emit("redisConnecting", {
                    reason: "CONNECTING - The redis server connecting.",
                    date: Date.now()
                });
                logger.info(`Redis connection connecting`, { label: "Redis" });
            });
            client.on("ready", () => {
                this.events.emit("redisConnected", {
                    reason: "CONNECTED - The redis server connected.",
                    date: Date.now()
                });
                logger.info(`Redis connection connected`, { label: "Redis" });
                this.cache = client;
                this.redis = client;
            });
            client.on("end", () => {
                this.events.emit("redisEnd", {
                    reason: "END - The redis server disconnected.",
                    date: Date.now()
                });
                logger.error(`Redis connection disconnected using .disconnect() or .quit()`, {
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
                    logger.error(`Redis connection error`, {
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
                    logger.error(`Redis connection lost, trying to reconnect...`, {
                        label: "Redis"
                    });
                    this.cache = null;
                    this.redis = client;
                }
            });

            await client.connect();
        } else if (!this.cache) this.cache = new Map();
        return true;
    }

    /**
     * @info check if the cache is enabled from the specified options.
     * @param options The options to check.
     * @returns {boolean} true or false if the cache is enabled / disabled.
     */
    static isCacheEnabled(options: {
        cache?: {
            toggle?: boolean;
            cacheOnly?: boolean;
        };
    }): boolean {
        return (options && options?.cache?.toggle === true ? true : false) ? true : this.options.cache?.toggle === true && (options ? options?.cache?.toggle !== false : true) ? true : false;
    }
}

export default DatabaseManager;
