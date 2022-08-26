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
class DatabaseManager {
    constructor() {
        this.mongoClient = null;
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
    /**
     * It connects to a mongo database and sets up some listeners for the connection.
     * @returns The mongoClient object.
     */
    static initMongo(url, options, databaseOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (options && options.logFile)
                    (0, logger_1.setLogFile)(options.logFile);
                if (options && options.cache)
                    this.cache = new Map();
                const mongo = mongoose_1.default;
                mongo.connection.on("error", (err) => {
                    if (err.code === "ECONNREFUSED") {
                        this.client = null;
                    }
                    if (!options || !options.hidelogs)
                        logger_1.logger.error(`Mongoose connection error: ${err.stack}`, {
                            label: "Database",
                        });
                });
                mongo.connection.on("disconnected", () => {
                    this.client = null;
                    if (!options || !options.hidelogs)
                        logger_1.logger.error(`Mongoose connection lost`, { label: "Database" });
                });
                mongo.connection.on("connected", () => {
                    this.client = mongo.connection;
                    if (!options || !options.hidelogs)
                        logger_1.logger.info(`Mongoose connection connected`, { label: "Database" });
                });
                mongo.connection.on("reconnected", () => {
                    this.client = mongo.connection;
                    if (!options || !options.hidelogs)
                        logger_1.logger.info(`Mongoose connection reconnected`, { label: "Database" });
                });
                mongo.connection.on("reconnectFailed", () => {
                    this.client = mongo.connection;
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
}
exports.default = DatabaseManager;
