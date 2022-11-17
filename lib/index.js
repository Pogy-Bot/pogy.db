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
/* eslint-disable @typescript-eslint/no-explicit-any */
const database_1 = __importDefault(require("./database"));
const lodash_1 = __importDefault(require("lodash"));
const mongoose_1 = __importDefault(require("mongoose"));
const collection_1 = __importDefault(require("./database/collection"));
const CacheService_1 = __importDefault(require("./database/CacheService"));
const logger_1 = require("./logger");
module.exports = {
    DatabaseManager: database_1.default,
    /**
     * @info check if the database is online
     * @returns {boolean} true if the database is online
     */
    isOnline: () => {
        return database_1.default.client ? true : false;
    },
    /**
     * @info Initiate the connection to mongo db
     * @param {string} url - The url of the mongo db
     * @param {Options} options - The options for the mongo db
     */
    connect: function (url, options, databaseOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!url)
                throw new TypeError("A database url was not provided.");
            const connection = yield database_1.default.initMongo(url, options, databaseOptions);
            database_1.default.tables = (yield connection.db.listCollections().toArray()).map((i) => i.name);
            return true;
        });
    },
    /**
     * @info Get the execution time of your queries.
     * @param {pingOptions} options - The ping options
     * @returns {PingResult | boolean} - The ping result or false if the data or table is not found
     * @throws {TypeError} - If one of the options are missing
     */
    ping: function (options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options)
                throw new TypeError("Ping options were not provided.");
            if (!options.tableName)
                throw new TypeError("A table name was not provided.");
            if (!options.dataToGet)
                throw new TypeError("A data to get was not provided.");
            if (!this.isOnline())
                return false;
            if (!database_1.default.tables.includes(options.tableName))
                return false;
            const functions = [
                () => __awaiter(this, void 0, void 0, function* () {
                    const currentTime_table = performance.now();
                    const table = yield new this.table(options.tableName);
                    const endTime_table = performance.now();
                    if (!table)
                        return false;
                    const currentTime_data = performance.now();
                    const dataToGet = yield table.get(options.dataToGet);
                    const endTime_data = performance.now();
                    if (!dataToGet)
                        return false;
                    const timeToGetTable = endTime_table - currentTime_table;
                    const timeToGetData = endTime_data - currentTime_data;
                    return {
                        timeToGetTable: timeToGetTable,
                        timeToGetData: timeToGetData
                    };
                }),
                () => __awaiter(this, void 0, void 0, function* () {
                    if (database_1.default.redis) {
                        const currentTime = performance.now();
                        yield database_1.default.redis.ping();
                        const endTime = performance.now();
                        return endTime - currentTime;
                    }
                    else
                        return "Redis is not enabled.";
                })
            ];
            const results = yield Promise.all(functions.map((f) => new Promise((resolve) => resolve(f()))));
            if (!results[0]) {
                logger_1.logger.warn("The data or table was not found.", {
                    label: "Database"
                });
                return {
                    cached: database_1.default.cache ? true : false,
                    tableName: options.tableName,
                    dataToGet: options.dataToGet,
                    timeToGetTable: 0,
                    timeToGetData: 0,
                    redisPing: results[1],
                    totalPing: 0 + (typeof results[1] === "number" ? results[1] : 0)
                };
            }
            return {
                cached: database_1.default.cache ? true : false,
                tableName: options.tableName,
                dataToGet: options.dataToGet,
                timeToGetTable: results[0].timeToGetTable,
                timeToGetData: results[0].timeToGetData,
                redisPing: results[1],
                totalPing: results[0].timeToGetTable + results[0].timeToGetData + (typeof results[1] === "number" ? results[1] : 0)
            };
        });
    },
    /**
     * @info Copy the database to another connection
     * @param {string} schema - The schema to migrate to.
     * @param {string} newConnection - The new database connection.
     * @returns {migrationObject} - The migrated data.
     */
    migrate: function (schema, newConnection, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const errors = [];
            const currentTiming = Date.now();
            const isLogsHidden = !options || (options.logs && options.logs.hidden !== true);
            if (!this.isOnline()) {
                if (isLogsHidden)
                    logger_1.logger.error(`Unable to migrate since the database was offline`, {
                        label: "Migrations"
                    });
                return {
                    table: schema,
                    timeTaken: Date.now() - currentTiming,
                    dataCreated: 0,
                    date: Date.now(),
                    errors: [
                        {
                            error: new TypeError("The database was offline."),
                            step: 1,
                            date: Date.now()
                        }
                    ]
                };
            }
            function migrate() {
                return __awaiter(this, void 0, void 0, function* () {
                    let step = 0;
                    try {
                        if (isLogsHidden)
                            logger_1.logger.info(`Preparing to migrate schema: "${schema}"`, {
                                label: "Migrations"
                            });
                        const DateNow = Date.now();
                        step = 1;
                        const data = yield (yield new this.table(schema)).all({
                            documentForm: true
                        });
                        step = 2;
                        if (isLogsHidden)
                            logger_1.logger.info(`Fetched data in ${Date.now() - DateNow}ms`, {
                                label: "Migrations"
                            });
                        step = 3;
                        const newConnectionDatabase = yield mongoose_1.default.createConnection(newConnection);
                        step = 4;
                        try {
                            step = 5;
                            const newTable = yield newConnectionDatabase.createCollection(schema);
                            yield newTable.insertMany(data);
                            step = 7.1;
                            if (isLogsHidden)
                                logger_1.logger.info(`Created migration table`, {
                                    label: "Migrations"
                                });
                        }
                        catch (err) {
                            step = 6;
                            const newTable = yield newConnectionDatabase.model(schema, new mongoose_1.default.Schema({
                                id: String,
                                data: Object
                            }));
                            yield newTable.deleteMany({});
                            yield newTable.insertMany(data);
                            step = 7.2;
                            if (isLogsHidden)
                                logger_1.logger.info(`Updated migration table`, {
                                    label: "Migrations"
                                });
                        }
                        step = 8;
                        newConnectionDatabase.close();
                        step = 9;
                        if (isLogsHidden)
                            logger_1.logger.info(`Migration successful`, {
                                label: "Migrations"
                            });
                        const lastTiming = Date.now();
                        return {
                            errors: errors,
                            date: Date.now(),
                            timeTaken: lastTiming - currentTiming,
                            table: schema,
                            dataCreated: data.length
                        };
                    }
                    catch (err) {
                        if (isLogsHidden)
                            logger_1.logger.error(`Migration Error: ${err.message} on step ${step}`, {
                                label: "Migrations"
                            });
                        errors.push({
                            error: err,
                            step: step,
                            date: Date.now()
                        });
                        return {
                            errors: errors,
                            date: Date.now(),
                            timeTaken: Date.now() - currentTiming,
                            table: schema,
                            dataCreated: 0
                        };
                    }
                });
            }
            return yield migrate();
        });
    },
    /**
     * Get a table from the database
     * @param {string} table - The name of the table
     * @returns {CustomizedTable | any} The table object
     * @throws {TypeError} If the table encounters an error
     */
    table: function (tableName, tableOptions) {
        return (() => __awaiter(this, void 0, void 0, function* () {
            if (!database_1.default.client)
                return false;
            if (typeof tableName !== "string")
                throw new TypeError("Table name has to be a string. Need Help ? Visit pogy.xyz/support");
            else if (tableName.includes(" "))
                throw new TypeError("Table name cannot include spaces. Need Help ? Visit pogy.xyz/support");
            if (!database_1.default.tables.includes(tableName)) {
                database_1.default.tables.push(tableName);
            }
            this.table = (0, collection_1.default)(database_1.default.client, tableName);
            yield CacheService_1.default.init(this.table);
            /**
             * @info Get the value of a key from the table
             * @param {string} key - The key to get the value of
             * @param {object} options - The options provided. Supports cache: true if the original cache was false
             * @returns {null | string | number | unknown} The value of the key
             * @throws {TypeError} If no key was specified
             */
            this.get = function (key, options) {
                var _a, _b, _c;
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!key)
                            throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                        if (((_a = options === null || options === void 0 ? void 0 : options.cache) === null || _a === void 0 ? void 0 : _a.cacheOnly) && !((_b = options === null || options === void 0 ? void 0 : options.cache) === null || _b === void 0 ? void 0 : _b.toggle)) {
                            throw new TypeError("Make sure to enable the cache for this function before using cacheOnly. Need Help ? Visit pogy.xyz/support");
                        }
                        let fetchedData;
                        const isCacheEnabled = database_1.default.isCacheEnabled(options);
                        if (isCacheEnabled && !database_1.default.cache)
                            database_1.default.enableCache();
                        if (isCacheEnabled) {
                            if (!database_1.default.redis && database_1.default.cache.has(this.table.collection.name + "." + key) === true) {
                                fetchedData = database_1.default.cache.get(this.table.collection.name + "." + key);
                            }
                            else {
                                if (database_1.default.redis) {
                                    try {
                                        fetchedData = yield database_1.default.redis.json.get(this.table.collection.name + "." + key);
                                    }
                                    catch (err) {
                                        fetchedData = yield database_1.default.redis.get(this.table.collection.name + "." + key);
                                    }
                                }
                            }
                        }
                        if (!fetchedData && !((_c = options === null || options === void 0 ? void 0 : options.cache) === null || _c === void 0 ? void 0 : _c.cacheOnly))
                            return null;
                        if (!fetchedData) {
                            let targetProvided;
                            if (key.includes(".")) {
                                const unparsedTarget = key.split(".");
                                key = unparsedTarget.shift();
                                targetProvided = unparsedTarget.join(".");
                            }
                            fetchedData = yield this.table.findOne({ id: key });
                            if (!fetchedData || (fetchedData.expireAt && fetchedData.expireAt.getTime() - Date.now() <= 0)) {
                                return null;
                            }
                            fetchedData = fetchedData.data;
                            if (targetProvided) {
                                fetchedData = lodash_1.default.get(fetchedData, targetProvided);
                                if (isCacheEnabled) {
                                    if (database_1.default.redis) {
                                        if (typeof fetchedData === "object") {
                                            try {
                                                yield database_1.default.redis.json.set(this.table.collection.name + "." + key + "." + targetProvided, "$", fetchedData);
                                            }
                                            catch (err) {
                                                yield database_1.default.redis.del(this.table.collection.name + "." + key + "." + targetProvided);
                                                yield database_1.default.redis.json.set(this.table.collection.name + "." + key + "." + targetProvided, "$", fetchedData);
                                            }
                                        }
                                        else {
                                            yield database_1.default.redis.set(this.table.collection.name + "." + key + "." + targetProvided, typeof fetchedData + ":" + fetchedData);
                                        }
                                    }
                                    else {
                                        database_1.default.cache.set(this.table.collection.name + "." + key + "." + targetProvided, fetchedData);
                                    }
                                }
                            }
                            else {
                                if (isCacheEnabled && tableOptions && tableOptions.cacheLargeData) {
                                    if (database_1.default.redis) {
                                        if (typeof fetchedData === "object") {
                                            try {
                                                yield database_1.default.redis.json.set(this.table.collection.name + "." + key, "$", fetchedData);
                                            }
                                            catch (err) {
                                                yield database_1.default.redis.del(this.table.collection.name + "." + key);
                                                yield database_1.default.redis.json.set(this.table.collection.name + "." + key, "$", fetchedData);
                                            }
                                        }
                                        else {
                                            yield database_1.default.redis.set(this.table.collection.name + "." + key, typeof fetchedData + ":" + fetchedData);
                                        }
                                    }
                                    else {
                                        database_1.default.cache.set(this.table.collection.name + "." + key, fetchedData);
                                    }
                                }
                            }
                        }
                        if (database_1.default.redis && fetchedData) {
                            if (typeof fetchedData === "string") {
                                if (fetchedData.toString().startsWith("boolean:")) {
                                    fetchedData = fetchedData.replace("boolean:", "");
                                    if (fetchedData === "true")
                                        fetchedData = true;
                                    else if (fetchedData === "false")
                                        fetchedData = false;
                                }
                                else if (fetchedData.toString().startsWith("number:")) {
                                    fetchedData = fetchedData.replace("number:", "");
                                    fetchedData = Number(fetchedData);
                                }
                                else if (fetchedData.toString().startsWith("object:")) {
                                    const val = fetchedData.replace("object:", "");
                                    if (val === "null")
                                        fetchedData = null;
                                }
                                else if (fetchedData.toString().startsWith("string:")) {
                                    fetchedData = fetchedData.replace("string:", "");
                                }
                            }
                        }
                        return fetchedData;
                    }
                    catch (err) {
                        // eslint-disable-next-line no-console
                        console.log(err);
                        if (tableOptions && tableOptions.catchErrors) {
                            logger_1.logger.error("[table.get()]: " + err.message, {
                                label: "Table"
                            });
                        }
                        return null;
                    }
                });
            };
            /**
             * @info Set the value of a key in the table
             * @param {string} key - The key to set the value of
             * @param {string | number | boolean | unknown} value - The value to set the key to
             * @param {object} options - The options provided. Supports cache: true if the original cache was false and returnData: true if you want the data to be returned
             * @returns {null | boolean | any} The result of the operation or the data if returnData is true, null for errors
             * @throws {TypeError} If no key or value was specified
             **/
            this.set = function (key, value, options) {
                var _a, _b, _c, _d, _e, _f, _g;
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!key)
                            throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                        if (!value)
                            value = null;
                        if (((_a = options === null || options === void 0 ? void 0 : options.cache) === null || _a === void 0 ? void 0 : _a.cacheOnly) && !((_b = options === null || options === void 0 ? void 0 : options.cache) === null || _b === void 0 ? void 0 : _b.toggle)) {
                            throw new TypeError("Make sure to enable the cache for this function before using cacheOnly. Need Help ? Visit pogy.xyz/support");
                        }
                        const initialKey = key;
                        let targetProvided;
                        if (key.includes(".")) {
                            const unparsedTarget = key.split(".");
                            key = unparsedTarget.shift();
                            targetProvided = unparsedTarget.join(".");
                        }
                        const isCacheEnabled = database_1.default.isCacheEnabled(options);
                        if (isCacheEnabled && !database_1.default.cache)
                            database_1.default.enableCache();
                        if (targetProvided) {
                            if (isCacheEnabled) {
                                if (database_1.default.redis) {
                                    if (typeof value === "object" && value) {
                                        try {
                                            yield database_1.default.redis.json.set(this.table.collection.name + "." + key + "." + targetProvided, "$", value);
                                        }
                                        catch (err) {
                                            yield database_1.default.redis.del(this.table.collection.name + "." + key + "." + targetProvided);
                                            yield database_1.default.redis.json.set(this.table.collection.name + "." + key + "." + targetProvided, "$", value);
                                        }
                                    }
                                    else {
                                        yield database_1.default.redis.set(this.table.collection.name + "." + key + "." + targetProvided, typeof value + ":" + value);
                                    }
                                }
                                else {
                                    database_1.default.cache.set(this.table.collection.name + "." + key + "." + targetProvided, value);
                                }
                            }
                            if (!((_c = options === null || options === void 0 ? void 0 : options.cache) === null || _c === void 0 ? void 0 : _c.cacheOnly)) {
                                yield this.table.updateOne({ id: key }, {
                                    $set: CacheService_1.default.shouldExpire((_d = options === null || options === void 0 ? void 0 : options.database) === null || _d === void 0 ? void 0 : _d.ttl)
                                        ? {
                                            [targetProvided ? "data." + targetProvided : "data"]: value,
                                            expireAt: CacheService_1.default.createDuration(options.database.ttl * 1000)
                                        }
                                        : {
                                            [targetProvided ? "data." + targetProvided : "data"]: value
                                        }
                                }, { upsert: true });
                            }
                        }
                        else {
                            if (isCacheEnabled && tableOptions && tableOptions.cacheLargeData) {
                                if (database_1.default.redis) {
                                    if (typeof value === "object" && value) {
                                        try {
                                            yield database_1.default.redis.json.set(this.table.collection.name + "." + key, "$", value);
                                        }
                                        catch (err) {
                                            yield database_1.default.redis.del(this.table.collection.name + "." + key);
                                            yield database_1.default.redis.json.set(this.table.collection.name + "." + key, "$", value);
                                        }
                                    }
                                    else {
                                        yield database_1.default.redis.set(this.table.collection.name + "." + key, typeof value + ":" + value);
                                    }
                                }
                                else
                                    database_1.default.cache.set(this.table.collection.name + "." + key, value);
                            }
                            if (!((_e = options === null || options === void 0 ? void 0 : options.cache) === null || _e === void 0 ? void 0 : _e.cacheOnly)) {
                                yield this.table.updateOne({ id: key }, {
                                    $set: CacheService_1.default.shouldExpire((_f = options === null || options === void 0 ? void 0 : options.database) === null || _f === void 0 ? void 0 : _f.ttl)
                                        ? {
                                            expireAt: CacheService_1.default.createDuration(options.database.ttl * 1000),
                                            [targetProvided ? "data." + targetProvided : "data"]: value
                                        }
                                        : {
                                            [targetProvided ? "data." + targetProvided : "data"]: value
                                        }
                                }, { upsert: true });
                            }
                        }
                        if ((_g = options === null || options === void 0 ? void 0 : options.database) === null || _g === void 0 ? void 0 : _g.ttl) {
                            const table = yield this.table.findOne({ id: key });
                            if (table) {
                                CacheService_1.default.setCache({
                                    key: this.table.collection.name + "." + initialKey,
                                    id: table._id.toString()
                                });
                            }
                        }
                        if (options && options.returnData) {
                            return yield this.get(initialKey, options);
                        }
                        else
                            return true;
                    }
                    catch (err) {
                        // eslint-disable-next-line no-console
                        console.log(err);
                        if (tableOptions && tableOptions.catchErrors) {
                            logger_1.logger.error("[table.set()]: " + err.message, {
                                label: "Table"
                            });
                        }
                        return null;
                    }
                });
            };
            /**
             * @info Add a value to a key in the table
             * @param {string} key - The key to add the value to
             * @param {number | string} value - The value to add to the key
             * @param {object} options - The options provided. Supports cache: true if the original cache was false and returnData: true if you want the data to be returned
             * @returns {null | boolean | unknown} The result of the operation or the data if returnData is true, null for errors
             * @throws {TypeError} If no key or value was specified
             **/
            this.add = function (key, value, options) {
                var _a, _b, _c, _d, _e, _f;
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!key)
                            throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                        if (isNaN(Number(value)))
                            throw new TypeError("Must specify value to add. Need Help ? Visit pogy.xyz/support");
                        const initialKey = key;
                        let targetProvided;
                        if (key.includes(".")) {
                            const unparsedTarget = key.split(".");
                            key = unparsedTarget.shift();
                            targetProvided = unparsedTarget.join(".");
                        }
                        if (isNaN(Number(value)))
                            return true;
                        value = parseInt(Number(value).toString());
                        const isCacheEnabled = database_1.default.isCacheEnabled(options);
                        if (isCacheEnabled && !database_1.default.cache)
                            database_1.default.enableCache();
                        if (((_a = options === null || options === void 0 ? void 0 : options.cache) === null || _a === void 0 ? void 0 : _a.cacheOnly) && !((_b = options === null || options === void 0 ? void 0 : options.cache) === null || _b === void 0 ? void 0 : _b.toggle)) {
                            throw new TypeError("Make sure to enable the cache for this function before using cacheOnly. Need Help ? Visit pogy.xyz/support");
                        }
                        if (targetProvided) {
                            if (isCacheEnabled) {
                                if (database_1.default.redis) {
                                    const addedVal = yield this.get(key + "." + targetProvided, options);
                                    if (addedVal) {
                                        yield database_1.default.redis.set(this.table.collection.name + "." + key + "." + targetProvided, "number:" + Number(Number(addedVal) + value));
                                    }
                                    else {
                                        yield database_1.default.redis.set(this.table.collection.name + "." + key + "." + targetProvided, "number:" + value);
                                    }
                                    if (!((_c = options === null || options === void 0 ? void 0 : options.cache) === null || _c === void 0 ? void 0 : _c.cacheOnly)) {
                                        yield this.table.updateOne({ id: key }, {
                                            $inc: {
                                                [targetProvided ? "data." + targetProvided : "data"]: value
                                            }
                                        }, { upsert: true });
                                    }
                                }
                                else {
                                    if (database_1.default.cache.get(this.table.collection.name + "." + key + "." + targetProvided)) {
                                        database_1.default.cache.set(this.table.collection.name + "." + key + "." + targetProvided, database_1.default.cache.get(this.table.collection.name + "." + key + "." + targetProvided) + value);
                                        if (!((_d = options === null || options === void 0 ? void 0 : options.cache) === null || _d === void 0 ? void 0 : _d.cacheOnly)) {
                                            yield this.table.updateOne({ id: key }, {
                                                $inc: {
                                                    [targetProvided ? "data." + targetProvided : "data"]: value
                                                }
                                            }, { upsert: true });
                                        }
                                    }
                                    else {
                                        const dataFetched = yield this.table.findOneAndUpdate({ id: key }, {
                                            $inc: {
                                                [targetProvided ? "data." + targetProvided : "data"]: value
                                            }
                                        }, { upsert: true, new: true });
                                        if (dataFetched && dataFetched.value && dataFetched.value.data) {
                                            const incrementedData = lodash_1.default.get(dataFetched.value.data, targetProvided);
                                            database_1.default.cache.set(this.table.collection.name + "." + key + "." + targetProvided, incrementedData ? incrementedData : value);
                                        }
                                    }
                                }
                            }
                            else {
                                if (!((_e = options === null || options === void 0 ? void 0 : options.cache) === null || _e === void 0 ? void 0 : _e.cacheOnly)) {
                                    yield this.table.updateOne({ id: key }, {
                                        $inc: {
                                            [targetProvided ? "data." + targetProvided : "data"]: value
                                        }
                                    }, { upsert: true });
                                }
                            }
                        }
                        else {
                            if (isCacheEnabled && tableOptions && tableOptions.cacheLargeData) {
                                if (database_1.default.redis) {
                                    const addedVal = yield this.get(key, options);
                                    if (addedVal) {
                                        yield database_1.default.redis.set(this.table.collection.name + "." + key, "number:" + Number(Number(addedVal) + value));
                                    }
                                    else {
                                        yield database_1.default.redis.set(this.table.collection.name + "." + key, "number:" + value);
                                    }
                                }
                                else {
                                    database_1.default.cache.set(this.table.collection.name + "." + key, (database_1.default.cache.get(this.table.collection.name + "." + key) || 0) + value);
                                }
                            }
                            if (!((_f = options === null || options === void 0 ? void 0 : options.cache) === null || _f === void 0 ? void 0 : _f.cacheOnly)) {
                                yield this.table.updateOne({ id: key }, {
                                    $inc: {
                                        [targetProvided ? "data." + targetProvided : "data"]: value
                                    }
                                }, { upsert: true });
                            }
                        }
                        if (options && options.returnData) {
                            return yield this.get(initialKey, options);
                        }
                        else
                            return true;
                    }
                    catch (err) {
                        if (tableOptions && tableOptions.catchErrors) {
                            logger_1.logger.error("[table.add()]: " + err.message, {
                                label: "Table"
                            });
                        }
                        return null;
                    }
                });
            };
            /**
             * @info Subtract a value from a key in the table
             * @param {string} key - The key to subtract the value to
             * @param {number | string} value - The value to subtract from the key
             * @param {object} options - The options provided. Supports cache: true if the original cache was false and returnData: true if you want the data to be returned
             * @returns {null | boolean | any} The result of the operation or the data if returnData is true, null for errors
             * @throws {TypeError} If no key or value was specified
             **/
            this.subtract = function (key, value, options) {
                var _a, _b, _c, _d, _e, _f, _g;
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!key)
                            throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                        if (isNaN(Number(value)))
                            throw new TypeError("Must specify value to subtract. Need Help ? Visit pogy.xyz/support");
                        if (((_a = options === null || options === void 0 ? void 0 : options.cache) === null || _a === void 0 ? void 0 : _a.cacheOnly) && !((_b = options === null || options === void 0 ? void 0 : options.cache) === null || _b === void 0 ? void 0 : _b.toggle)) {
                            throw new TypeError("Make sure to enable the cache for this function before using cacheOnly. Need Help ? Visit pogy.xyz/support");
                        }
                        const initialKey = key;
                        let targetProvided;
                        if (key.includes(".")) {
                            const unparsedTarget = key.split(".");
                            key = unparsedTarget.shift();
                            targetProvided = unparsedTarget.join(".");
                        }
                        if (isNaN(Number(value)))
                            return true;
                        // eslint-disable-next-line no-bitwise
                        value = ~parseInt(Number(value).toString()) + 1;
                        const isCacheEnabled = database_1.default.isCacheEnabled(options);
                        if (isCacheEnabled && !database_1.default.cache)
                            database_1.default.enableCache();
                        if (targetProvided) {
                            if (isCacheEnabled) {
                                if (database_1.default.redis) {
                                    const addedVal = yield this.get(key + "." + targetProvided, options);
                                    if (addedVal) {
                                        yield database_1.default.redis.set(this.table.collection.name + "." + key + "." + targetProvided, "number:" + Number(Number(addedVal) + value));
                                    }
                                    else {
                                        yield database_1.default.redis.set(this.table.collection.name + "." + key + "." + targetProvided, "number:" + value);
                                    }
                                    if (!((_c = options === null || options === void 0 ? void 0 : options.cache) === null || _c === void 0 ? void 0 : _c.cacheOnly)) {
                                        yield this.table.updateOne({ id: key }, {
                                            $inc: {
                                                [targetProvided ? "data." + targetProvided : "data"]: value
                                            }
                                        }, { upsert: true });
                                    }
                                }
                                else {
                                    if (database_1.default.cache.get(this.table.collection.name + "." + key + "." + targetProvided)) {
                                        database_1.default.cache.set(this.table.collection.name + "." + key + "." + targetProvided, database_1.default.cache.get(this.table.collection.name + "." + key + "." + targetProvided) + value);
                                        if (!((_d = options === null || options === void 0 ? void 0 : options.cache) === null || _d === void 0 ? void 0 : _d.cacheOnly)) {
                                            yield this.table.updateOne({ id: key }, {
                                                $inc: {
                                                    [targetProvided ? "data." + targetProvided : "data"]: value
                                                }
                                            }, { upsert: true });
                                        }
                                    }
                                    else if (!((_e = options === null || options === void 0 ? void 0 : options.cache) === null || _e === void 0 ? void 0 : _e.cacheOnly)) {
                                        const dataFetched = yield this.table.findOneAndUpdate({ id: key }, {
                                            $inc: {
                                                [targetProvided ? "data." + targetProvided : "data"]: value
                                            }
                                        }, { upsert: true, new: true });
                                        if (dataFetched && dataFetched.value && dataFetched.value.data) {
                                            const decrementedData = lodash_1.default.get(dataFetched.value.data, targetProvided);
                                            database_1.default.cache.set(this.table.collection.name + "." + key + "." + targetProvided, decrementedData ? decrementedData : value);
                                        }
                                    }
                                }
                            }
                            else if (!((_f = options === null || options === void 0 ? void 0 : options.cache) === null || _f === void 0 ? void 0 : _f.cacheOnly)) {
                                yield this.table.updateOne({ id: key }, {
                                    $inc: {
                                        [targetProvided ? "data." + targetProvided : "data"]: value
                                    }
                                }, { upsert: true });
                            }
                        }
                        else {
                            if (isCacheEnabled && tableOptions && tableOptions.cacheLargeData) {
                                if (database_1.default.redis) {
                                    const addedVal = yield this.get(key, options);
                                    if (addedVal) {
                                        yield database_1.default.redis.set(this.table.collection.name + "." + key, "number:" + Number(Number(addedVal) + value));
                                    }
                                    else {
                                        yield database_1.default.redis.set(this.table.collection.name + "." + key, "number:" + value);
                                    }
                                }
                                else {
                                    database_1.default.cache.set(this.table.collection.name + "." + key, (database_1.default.cache.get(this.table.collection.name + "." + key) || 0) + value);
                                }
                            }
                            if (!((_g = options === null || options === void 0 ? void 0 : options.cache) === null || _g === void 0 ? void 0 : _g.cacheOnly)) {
                                yield this.table.updateOne({ id: key }, {
                                    $inc: {
                                        [targetProvided ? "data." + targetProvided : "data"]: value
                                    }
                                }, { upsert: true });
                            }
                        }
                        if (options && options.returnData) {
                            return yield this.get(initialKey, options);
                        }
                        else
                            return true;
                    }
                    catch (err) {
                        if (tableOptions && tableOptions.catchErrors) {
                            logger_1.logger.error("[table.subtract()]: " + err.message, {
                                label: "Table"
                            });
                        }
                        return null;
                    }
                });
            };
            /**
             * @info Check if a key exists in the table (database) not cache
             * @param {string} key - The key to check if exists
             * @returns {boolean | null} The result of the operation or null if an error occured
             * @throws {TypeError} If no key was specified
             **/
            this.has = function (key, options) {
                var _a;
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!key)
                            throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                        let targetProvided;
                        if (key.includes(".")) {
                            const unparsedTarget = key.split(".");
                            key = unparsedTarget.shift();
                            targetProvided = unparsedTarget.join(".");
                        }
                        if ((_a = options === null || options === void 0 ? void 0 : options.cache) === null || _a === void 0 ? void 0 : _a.cacheOnly) {
                            if (database_1.default.redis) {
                                try {
                                    const data = yield database_1.default.redis.json.get(this.table.collection.name + "." + key + "." + targetProvided);
                                    if (data)
                                        return true;
                                    else
                                        return false;
                                }
                                catch (err) {
                                    const data = yield database_1.default.redis.get(this.table.collection.name + "." + key + "." + targetProvided);
                                    if (data)
                                        return true;
                                    else
                                        return false;
                                }
                            }
                            else {
                                if (database_1.default.cache.has(this.table.collection.name + "." + key + "." + targetProvided))
                                    return true;
                                else
                                    return false;
                            }
                        }
                        else {
                            let fetchedData = yield this.table.findOne({ id: key });
                            if (!fetchedData) {
                                return false;
                            }
                            fetchedData = fetchedData.data;
                            if (targetProvided) {
                                fetchedData = lodash_1.default.get(fetchedData, targetProvided);
                            }
                            return typeof fetchedData !== "undefined";
                        }
                    }
                    catch (err) {
                        if (tableOptions && tableOptions.catchErrors) {
                            logger_1.logger.error("[table.has()]: " + err.message, {
                                label: "Table"
                            });
                        }
                        return null;
                    }
                });
            };
            /**
             * @info Delete a key from the table
             * @param {string} key - The key to delete
             * @returns {boolean | null} The result of the operation, null if the table was not found or an error occured
             * @throws {TypeError} If no key was specified or the traget provided is not an object
             **/
            this.delete = function (key, options) {
                var _a;
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!key)
                            throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                        let targetProvided;
                        if (key.includes(".")) {
                            const unparsedTarget = key.split(".");
                            key = unparsedTarget.shift();
                            targetProvided = unparsedTarget.join(".");
                        }
                        if (!((_a = options === null || options === void 0 ? void 0 : options.cache) === null || _a === void 0 ? void 0 : _a.cacheOnly)) {
                            let fetchedData = yield this.table.findOne({ id: key });
                            if (!fetchedData) {
                                return null;
                            }
                            fetchedData = fetchedData.data;
                            if (typeof fetchedData === "object" && targetProvided) {
                                if (database_1.default.cache) {
                                    if (!database_1.default.redis) {
                                        const keys = [...database_1.default.cache.keys()].filter((key_) => key_.startsWith(this.table.collection.name + "." + key + "." + targetProvided));
                                        for (const key__ of keys) {
                                            database_1.default.cache.delete(key__);
                                        }
                                    }
                                    else {
                                        const keys = yield database_1.default.redis.keys(this.table.collection.name + "." + key + "." + targetProvided + "*");
                                        for (let i = 0; i < keys.length; i++) {
                                            yield database_1.default.redis.del(keys[i]);
                                        }
                                    }
                                }
                                lodash_1.default.unset(fetchedData, targetProvided);
                                yield this.table.updateOne({ id: key }, { $set: { data: fetchedData } });
                                return true;
                            }
                            else if (targetProvided)
                                throw new TypeError("The target provided is not an object.");
                            else {
                                if (database_1.default.cache) {
                                    if (!database_1.default.redis) {
                                        database_1.default.cache.forEach((_, key_) => {
                                            if (key_.startsWith(this.table.collection.name + "." + key)) {
                                                database_1.default.cache.delete(key_);
                                            }
                                        });
                                    }
                                    else {
                                        const keys = yield database_1.default.redis.keys(this.table.collection.name + "." + key + "*");
                                        for (let i = 0; i < keys.length; i++) {
                                            yield database_1.default.redis.del(keys[i]);
                                        }
                                    }
                                }
                                yield this.table.deleteOne({ id: key });
                            }
                            return true;
                        }
                        else {
                            if (database_1.default.cache) {
                                if (!database_1.default.redis) {
                                    database_1.default.cache.forEach((_, key_) => {
                                        if (key_.startsWith(this.table.collection.name + "." + key)) {
                                            database_1.default.cache.delete(key_);
                                        }
                                    });
                                }
                                else {
                                    const keys = yield database_1.default.redis.keys(this.table.collection.name + "." + key + "*");
                                    for (let i = 0; i < keys.length; i++) {
                                        yield database_1.default.redis.del(keys[i]);
                                    }
                                }
                            }
                            return true;
                        }
                    }
                    catch (err) {
                        if (tableOptions && tableOptions.catchErrors) {
                            logger_1.logger.error("[table.delete()]: " + err.message, {
                                label: "Table"
                            });
                        }
                        return null;
                    }
                });
            };
            /**
             * @info Push or create a value to an array in the table
             * @param {string} key - The key to push the value to
             * @param {string | number | boolean | unknown} value - The value to push to the key
             * @param {object} options - The options provided. Supports cache: true if the original cache was false and returnData: true if you want the data to be returned
             * @returns {null | boolean | unknown} The result of the operation or the data if returnData is true, null for errors
             * @throws {TypeError} If no key or value was specified
             **/
            this.push = function (key, value, options) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!key)
                            throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                        if (!value && value !== 0)
                            throw new TypeError("No value specified. Need Help ? Visit pogy.xyz/support");
                        const initialKey = key;
                        let targetProvided;
                        if (key.includes(".")) {
                            const unparsedTarget = key.split(".");
                            key = unparsedTarget.shift();
                            targetProvided = unparsedTarget.join(".");
                        }
                        const isCacheEnabled = database_1.default.isCacheEnabled(options);
                        if (isCacheEnabled && !database_1.default.cache)
                            database_1.default.enableCache();
                        yield this.table
                            .updateOne({ id: key }, {
                            $push: {
                                [targetProvided ? "data." + targetProvided : "data"]: value
                            }
                        }, { upsert: true })
                            .then(() => __awaiter(this, void 0, void 0, function* () {
                            let fetchedData = (yield this.table.findOne({ id: key })).data;
                            if (targetProvided) {
                                fetchedData = lodash_1.default.get(fetchedData, targetProvided);
                                if (isCacheEnabled) {
                                    if (!database_1.default.redis) {
                                        database_1.default.cache.set(this.table.collection.name + "." + key + "." + targetProvided, fetchedData);
                                    }
                                    else {
                                        yield database_1.default.redis.json.set(this.table.collection.name + "." + key + "." + targetProvided, "$", fetchedData);
                                    }
                                }
                            }
                            else {
                                if (isCacheEnabled && tableOptions && tableOptions.cacheLargeData) {
                                    if (!database_1.default.redis) {
                                        database_1.default.cache.set(this.table.collection.name + "." + key, fetchedData);
                                    }
                                    else {
                                        yield database_1.default.redis.json.set(this.table.collection.name + "." + key, "$", fetchedData);
                                    }
                                }
                            }
                        }));
                        if (options && options.returnData) {
                            return yield this.get(initialKey, options);
                        }
                        else
                            return true;
                    }
                    catch (err) {
                        if (tableOptions && tableOptions.catchErrors) {
                            logger_1.logger.error("[table.push()]: " + err.message, {
                                label: "Table"
                            });
                        }
                        return null;
                    }
                });
            };
            /**
             * @info Remove a value from an array in the table
             * @param {string} key - The key to remove the value from the array
             * @param {string | number | boolean | unknown} value - The value to remove to the key
             * @param {object} options - The options provided. Supports cache: true if the original cache was false and returnData: true if you want the data to be returned
             * @returns {null | boolean | unknown} The result of the operation or the data if returnData is true, null for errors
             * @throws {TypeError} If no key or value was specified
             **/
            this.pull = function (key, value, options) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!key)
                            throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                        if (!value && value !== 0)
                            throw new TypeError("No value specified. Need Help ? Visit pogy.xyz/support");
                        const initialKey = key;
                        let targetProvided;
                        if (key.includes(".")) {
                            const unparsedTarget = key.split(".");
                            key = unparsedTarget.shift();
                            targetProvided = unparsedTarget.join(".");
                        }
                        const isCacheEnabled = database_1.default.isCacheEnabled(options);
                        if (isCacheEnabled && !database_1.default.cache)
                            database_1.default.enableCache();
                        yield this.table
                            .updateOne({ id: key }, {
                            $pull: {
                                [targetProvided ? "data." + targetProvided : "data"]: value
                            }
                        }, { upsert: true })
                            .then(() => __awaiter(this, void 0, void 0, function* () {
                            let fetchedData = (yield this.table.findOne({ id: key })).data;
                            if (targetProvided) {
                                fetchedData = lodash_1.default.get(fetchedData, targetProvided);
                                if (options && options.cache && !database_1.default.cache)
                                    database_1.default.enableCache();
                                if (isCacheEnabled) {
                                    if (!database_1.default.redis) {
                                        database_1.default.cache.set(this.table.collection.name + "." + key + "." + targetProvided, fetchedData);
                                    }
                                    else {
                                        yield database_1.default.redis.json.set(this.table.collection.name + "." + key + "." + targetProvided, "$", fetchedData);
                                    }
                                }
                            }
                            else {
                                if (isCacheEnabled && tableOptions && tableOptions.cacheLargeData) {
                                    if (!database_1.default.redis) {
                                        database_1.default.cache.set(this.table.collection.name + "." + key, fetchedData);
                                    }
                                    else {
                                        yield database_1.default.redis.json.set(this.table.collection.name + "." + key, "$", fetchedData);
                                    }
                                }
                            }
                        }));
                        if (options && options.returnData) {
                            return yield this.get(initialKey, options);
                        }
                        else
                            return true;
                    }
                    catch (err) {
                        if (tableOptions && tableOptions.catchErrors) {
                            logger_1.logger.error("[table.pull()]: " + err.message, {
                                label: "Table"
                            });
                        }
                        return null;
                    }
                });
            };
            /**
             * @info Shift a value from an array in the table
             * @param {string} key - The key to shift the value from the array
             * @returns {null | boolean | unknown} The result of the operation or the data if returnData is true, null for errors
             **/
            this.shift = function (key, options) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!key)
                            throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                        const initialKey = key;
                        let targetProvided;
                        if (key.includes(".")) {
                            const unparsedTarget = key.split(".");
                            key = unparsedTarget.shift();
                            targetProvided = unparsedTarget.join(".");
                        }
                        const isCacheEnabled = database_1.default.isCacheEnabled(options);
                        if (isCacheEnabled && !database_1.default.cache)
                            database_1.default.enableCache();
                        yield this.table
                            .updateOne({ id: key }, {
                            $pop: {
                                [targetProvided ? "data." + targetProvided : "data"]: -1
                            }
                        }, { upsert: true })
                            .then(() => __awaiter(this, void 0, void 0, function* () {
                            let fetchedData = (yield this.table.findOne({ id: key })).data;
                            if (targetProvided) {
                                fetchedData = lodash_1.default.get(fetchedData, targetProvided);
                                if (options && options.cache && !database_1.default.cache)
                                    database_1.default.enableCache();
                                if (isCacheEnabled) {
                                    if (!database_1.default.redis) {
                                        database_1.default.cache.set(this.table.collection.name + "." + key + "." + targetProvided, fetchedData);
                                    }
                                    else {
                                        yield database_1.default.redis.json.set(this.table.collection.name + "." + key + "." + targetProvided, "$", fetchedData);
                                    }
                                }
                            }
                            else {
                                if (isCacheEnabled && tableOptions && tableOptions.cacheLargeData) {
                                    if (!database_1.default.redis) {
                                        database_1.default.cache.set(this.table.collection.name + "." + key, fetchedData);
                                    }
                                    else {
                                        yield database_1.default.redis.json.set(this.table.collection.name + "." + key, "$", fetchedData);
                                    }
                                }
                            }
                        }));
                        if (options && options.returnData) {
                            return yield this.get(initialKey, options);
                        }
                        else
                            return true;
                    }
                    catch (err) {
                        if (tableOptions && tableOptions.catchErrors) {
                            logger_1.logger.error("[table.shift()]: " + err.message, {
                                label: "Table"
                            });
                        }
                        return null;
                    }
                });
            };
            /**
             * @info Unshift a value to an array in the table
             * @param {string} key - The key to unshift the value to the array
             * @param {string | number | boolean | unknown} value - The value to unshift to the array
             * @returns {null | boolean | unknown} The result of the operation or the data if returnData is true, null for errors
             **/
            this.unshift = function (key, value, options) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!key)
                            throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                        if (!value && value !== 0)
                            throw new TypeError("No value specified. Need Help ? Visit pogy.xyz/support");
                        const initialKey = key;
                        let targetProvided;
                        if (key.includes(".")) {
                            const unparsedTarget = key.split(".");
                            key = unparsedTarget.shift();
                            targetProvided = unparsedTarget.join(".");
                        }
                        const isCacheEnabled = database_1.default.isCacheEnabled(options);
                        if (isCacheEnabled && !database_1.default.cache)
                            database_1.default.enableCache();
                        yield this.table
                            .updateOne({ id: key }, {
                            $push: {
                                [targetProvided ? "data." + targetProvided : "data"]: {
                                    $each: [value],
                                    $position: 0
                                }
                            }
                        }, { upsert: true })
                            .then(() => __awaiter(this, void 0, void 0, function* () {
                            let fetchedData = (yield this.table.findOne({ id: key })).data;
                            if (targetProvided) {
                                fetchedData = lodash_1.default.get(fetchedData, targetProvided);
                                if (options && options.cache && !database_1.default.cache)
                                    database_1.default.enableCache();
                                if (isCacheEnabled) {
                                    if (!database_1.default.redis) {
                                        database_1.default.cache.set(this.table.collection.name + "." + key + "." + targetProvided, fetchedData);
                                    }
                                    else {
                                        yield database_1.default.redis.json.set(this.table.collection.name + "." + key + "." + targetProvided, "$", fetchedData);
                                    }
                                }
                            }
                            else {
                                if (isCacheEnabled && tableOptions && tableOptions.cacheLargeData) {
                                    if (!database_1.default.redis) {
                                        database_1.default.cache.set(this.table.collection.name + "." + key, fetchedData);
                                    }
                                    else {
                                        yield database_1.default.redis.json.set(this.table.collection.name + "." + key, "$", fetchedData);
                                    }
                                }
                            }
                        }));
                        if (options && options.returnData) {
                            return yield this.get(initialKey, options);
                        }
                        else
                            return true;
                    }
                    catch (err) {
                        if (tableOptions && tableOptions.catchErrors) {
                            logger_1.logger.error("[table.unshift()]: " + err.message, {
                                label: "Table"
                            });
                        }
                        return null;
                    }
                });
            };
            /**
             * @info Fetch all the schemas from the table
             * @param {TableAllOptions} options - The options to fetch the schemas with
             * @returns {object} The schemas from the table
             * @throws {TypeError} If no key was specified
             **/
            this.all = function (options) {
                var _a;
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!((_a = options === null || options === void 0 ? void 0 : options.cache) === null || _a === void 0 ? void 0 : _a.cacheOnly)) {
                            const AllStoredData = yield this.table
                                .find({
                                $where: function () {
                                    const expiredCheck = !(this.expireAt && this.expireAt.getTime() - Date.now() <= 0);
                                    return expiredCheck;
                                }
                            })
                                .toArray();
                            if (options && options.documentForm) {
                                return AllStoredData;
                            }
                            let filtered = AllStoredData.filter((v) => { var _a, _b; return (_b = (_a = options === null || options === void 0 ? void 0 : options.filter) === null || _a === void 0 ? void 0 : _a.call(options, { id: v.id, data: v.data })) !== null && _b !== void 0 ? _b : true; }).map((m) => ({
                                id: m.id,
                                data: m.data
                            }));
                            if (typeof (options === null || options === void 0 ? void 0 : options.sort) === "string") {
                                if (options.sort.startsWith("."))
                                    options.sort = options.sort.slice(1);
                                const pref = options.sort.split(".");
                                filtered = lodash_1.default.sortBy(filtered, pref).reverse();
                            }
                            return typeof (options === null || options === void 0 ? void 0 : options.limit) === "number" && options.limit > 0 ? filtered.slice(0, options.limit) : filtered;
                        }
                        else {
                            const cacheKeys = [...database_1.default.cache.keys()];
                            const filtered = cacheKeys
                                .filter((v) => v.startsWith(this.table.collection.name + "."))
                                .map((m) => {
                                const data = database_1.default.cache.get(m);
                                const id = m.split(".").pop();
                                return {
                                    id,
                                    data
                                };
                            });
                            if (options && options.documentForm) {
                                return filtered;
                            }
                            let filtered2 = filtered
                                .filter((v) => { var _a, _b; return (_b = (_a = options === null || options === void 0 ? void 0 : options.filter) === null || _a === void 0 ? void 0 : _a.call(options, { id: v.id, data: v.data })) !== null && _b !== void 0 ? _b : true; })
                                .map((m) => ({
                                id: m.id,
                                data: m.data
                            }));
                            if (typeof (options === null || options === void 0 ? void 0 : options.sort) === "string") {
                                if (options.sort.startsWith("."))
                                    options.sort = options.sort.slice(1);
                                const pref = options.sort.split(".");
                                filtered2 = lodash_1.default.sortBy(filtered2, pref).reverse();
                            }
                            return typeof (options === null || options === void 0 ? void 0 : options.limit) === "number" && options.limit > 0 ? filtered2.slice(0, options.limit) : filtered2;
                        }
                    }
                    catch (err) {
                        if (tableOptions && tableOptions.catchErrors) {
                            logger_1.logger.error("[table.all()]: " + err.message, {
                                label: "Table"
                            });
                        }
                        return {};
                    }
                });
            };
            /**
             * @info Delete all the schemas from the table
             * @returns {boolean | null} The result of the operation, null if an error occured
             * @throws {TypeError} If no key was specified
             **/
            this.drop = function () {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (database_1.default.cache) {
                            if (!database_1.default.redis) {
                                database_1.default.cache.forEach((_, key) => {
                                    if (key.startsWith(this.table.collection.name)) {
                                        database_1.default.cache.delete(key);
                                    }
                                });
                            }
                            else {
                                const keys = yield database_1.default.redis.keys(this.table.collection.name + "*");
                                for (const key of keys) {
                                    yield database_1.default.redis.del(key);
                                }
                            }
                        }
                        yield this.table.collection.drop();
                        return true;
                    }
                    catch (err) {
                        if (tableOptions && tableOptions.catchErrors) {
                            logger_1.logger.error("[table.drop()]: " + err.message, {
                                label: "Table"
                            });
                        }
                        return null;
                    }
                });
            };
            /**
             * @info Gets Database statistics
             */
            this.stats = function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const stats = yield this.table.collection.stats();
                    return stats;
                });
            };
            return this;
        }))();
    }
};
