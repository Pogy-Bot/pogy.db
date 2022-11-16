"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
                if (options && options.redis && options.redis.url)
                    this.redisURL = options.redis.url;
                if (options && options.logFile)
                    (0, logger_1.setLogFile)(options.logFile);
                if (options && options.cache)
                    this.enableCache();
                const mongo = mongoose_1.default;
                mongo.connection.on("error", (err) => {
                    if (err.code === "ECONNREFUSED") {
                        this.client = null;
                        this.events.emit("databaseDown", {
                            reason: "ECONNREFUSED - The database refused the connection.",
                            date: Date.now(),
                        });
                    }
                    if (!options || !options.hidelogs)
                        logger_1.logger.error(`Mongoose connection error: ${err.stack}`, {
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
                        logger_1.logger.error(`Mongoose connection lost`, { label: "Database" });
                });
                mongo.connection.on("connected", () => {
                    this.client = mongo.connection;
                    this.events.emit("databaseUp", {
                        reason: "CONNECTED - The database connected.",
                        date: Date.now(),
                    });
                    if (!options || !options.hidelogs)
                        logger_1.logger.info(`Mongoose connection connected`, { label: "Database" });
                });
                mongo.connection.on("reconnected", () => {
                    this.client = mongo.connection;
                    this.events.emit("databaseUp", {
                        reason: "RECONNECTED - The database reconnected.",
                        date: Date.now(),
                    });
                    if (!options || !options.hidelogs)
                        logger_1.logger.info(`Mongoose connection reconnected`, { label: "Database" });
                });
                mongo.connection.on("reconnectFailed", () => {
                    this.client = null;
                    this.events.emit("databaseDown", {
                        reason: "RECONNECTFAILED - The database reconnect failed.",
                        date: Date.now(),
                    });
                    if (!options || !options.hidelogs)
                        logger_1.logger.info(`Mongoose connection failed to connect after the tries.`, {
                            label: "Database",
                        });
                });
                yield mongo.connect(url, databaseOptions || {
                    keepAlive: true,
                    minPoolSize: 3,
                    maxPoolSize: 10,
                    serverSelectionTimeoutMS: 10000,
                    socketTimeoutMS: 60000,
                });
                this.options = options;
                return mongo.connection;
            }
            catch (err) {
                console.log(err);
                logger_1.logger.error("Error connecting to mongo database: " + err, {
                    label: "Database",
                });
                process.exit(1);
            }
        });
    }
    static enableCache() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.redisURL) {
                const client = (0, redis_1.createClient)({
                    url: this.redisURL,
                });
                client.on("connect", () => {
                    this.events.emit("redisConnecting", {
                        reason: "CONNECTING - The redis server connecting.",
                        date: Date.now(),
                    });
                    logger_1.logger.info(`Redis connection connecting`, { label: "Redis" });
                });
                client.on("ready", () => {
                    this.events.emit("redisConnected", {
                        reason: "CONNECTED - The redis server connected.",
                        date: Date.now(),
                    });
                    logger_1.logger.info(`Redis connection connected`, { label: "Redis" });
                    this.cache = client;
                    this.redis = client;
                });
                client.on("end", () => {
                    this.events.emit("redisEnd", {
                        reason: "END - The redis server disconnected.",
                        date: Date.now(),
                    });
                    logger_1.logger.error(`Redis connection disconnected using .disconnect() or .quit()`, {
                        label: "Redis",
                    });
                    this.cache = null;
                    this.redis = client;
                });
                client.on("error", (err) => {
                    if (this.cache) {
                        this.events.emit("redisError", {
                            reason: "ERROR - The redis server encountered an error. ERROR: " +
                                err.message,
                            date: Date.now(),
                        });
                        console.log(err);
                        logger_1.logger.error(`Redis connection error`, {
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
                        logger_1.logger.error(`Redis connection lost, trying to reconnect...`, {
                            label: "Redis",
                        });
                        this.cache = null;
                        this.redis = client;
                    }
                });
                yield client.connect();
            }
            else if (!this.cache)
                this.cache = new Map();
            return true;
        });
    }
    static isCacheEnabled(options) {
        return options && options.cache === true
            ? true
            : false
                ? true
                : this.options.cache === true &&
                    (options ? (options === null || options === void 0 ? void 0 : options.cache) !== false : true)
                    ? true
                    : false;
    }
}
DatabaseManager.events = new events_1.EventEmitter();
exports.default = DatabaseManager;
