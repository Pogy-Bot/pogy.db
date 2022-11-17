/// <reference types="node" />
import mongoose from "mongoose";
import { Options } from "../types";
import { EventEmitter } from "events";
import { RedisClientType, RedisFunctions, RedisModules, RedisScripts } from "redis";
declare class DatabaseManager {
    /**
     * The mongoose client (the connection)
     * @type {mongoose.Connection | null}
     * @private
     * @memberof DatabaseManager
     */
    private mongoClient;
    /**
     * The redis client
     * @type {RedisClientType}
     * @private
     * @memberof DatabaseManager
     */
    private redisClient;
    /**
     * The database tables
     * @type {string[]}
     * @private
     * @memberof DatabaseManager
     */
    private mongoTables;
    /**
     * The mongooseCache which can be memory (Maps) or redis
     * @type {Map<string, unknown> | RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null}
     * @private
     * @memberof DatabaseManager
     */
    private mongoCache;
    /**
     * The redis client url
     * @type {string | null}
     * @private
     * @memberof DatabaseManager
     */
    private redisClientURL;
    /**
     * The database options
     * @type {Options}
     * @memberof DatabaseManager
     * @private
     * @readonly
     */
    private readonly options;
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
    static readonly events: EventEmitter;
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
    constructor();
    /**
     * Return the mongoose client
     * @returns {mongoose.Connection | null}
     * @memberof DatabaseManager
     */
    get client(): mongoose.Connection | null;
    /**
     * Sets the mongoose client
     * @param {mongoose.Connection | null} client
     * @private
     * @memberof DatabaseManager
     */
    private set client(value);
    /**
     * Returns the existing mongoose tables
     * @returns {string[]}
     * @memberof DatabaseManager
     */
    get tables(): string[];
    /**
     * Sets the mongoose tables
     * @param {string[]} tables
     * @private
     * @memberof DatabaseManager
     */
    private set tables(value);
    /**
     * Returns the existing cache
     * @returns {Map<string, unknown> | RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null}
     * @memberof DatabaseManager
     */
    get cache(): Map<string, unknown> | RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null;
    /**
     * Sets the cache
     * @param {Map<string, unknown> | RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null} cache
     * @private
     * @memberof DatabaseManager
     */
    private set cache(value);
    /**
     * Returns the redis client
     * @returns {RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null}
     * @memberof DatabaseManager
     */
    get redis(): RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null;
    /**
     * Sets the redis client
     * @param {RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null} client
     * @private
     * @memberof DatabaseManager
     */
    private set redis(value);
    /**
     * Returns the redis client url
     * @returns {string}
     * @memberof DatabaseManager
     */
    get redisURL(): string;
    /**
     * Sets the redis client url
     * @param {string} url
     * @private
     * @memberof DatabaseManager
     */
    private set redisURL(value);
    /**
     * It connects to a mongo database and sets up some listeners for the connection.
     * @returns The mongoClient object.
     */
    static initMongo(url: string, options?: Options, databaseOptions?: mongoose.ConnectOptions): Promise<mongoose.Connection>;
    static enableCache(): Promise<boolean>;
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
    }): boolean;
}
export default DatabaseManager;
