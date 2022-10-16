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
const database_1 = __importDefault(require("./database"));
const lodash_1 = __importDefault(require("lodash"));
const mongoose_1 = __importDefault(require("mongoose"));
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
     * @param {object} options - The options for the mongo db
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
     * @param {object} options - The ping options
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
                cached: database_1.default.cache ? true : false,
                tableName: options.tableName,
                dataToGet: options.dataToGet,
                timeToGetTable: timeToGetTable,
                timeToGetData: timeToGetData,
                totalPing: timeToGetTable + timeToGetData,
            };
        });
    },
    /**
     * @info Copy the database to another connection
     * @param {string} schema - The schema to migrate to.
     * @param {object} newConnection - The new database connection.
     * @returns {migrationObject} - The migrated data.
     */
    migrate: function (schema, newConnection, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isOnline()) {
                if (!options || !options.hidelogs)
                    logger_1.logger.error(`Unable to migrate since the database was offline`, {
                        label: "Migrations",
                    });
                return {
                    table: schema,
                    error: new Error("Unable to migrate since the database was offline"),
                };
            }
            const currentTiming = Date.now();
            let step = 0;
            try {
                if (!options || !options.hidelogs)
                    logger_1.logger.info(`Preparing to migrate schema: "${schema}"`, {
                        label: "Migrations",
                    });
                const DateNow = Date.now();
                step = 1;
                const data = yield (yield new this.table(schema)).all({
                    documentForm: true,
                });
                step = 2;
                if (!options || !options.hidelogs)
                    logger_1.logger.info(`Fetched data in ${Date.now() - DateNow}ms`, {
                        label: "Migrations",
                    });
                step = 3;
                const newConnectionDatabase = yield mongoose_1.default.createConnection(newConnection);
                step = 4;
                try {
                    step = 5;
                    const newTable = yield newConnectionDatabase.createCollection(schema);
                    yield newTable.insertMany(data);
                    step = 7.1;
                    if (!options || !options.hidelogs)
                        logger_1.logger.info(`Created migration table`, {
                            label: "Migrations",
                        });
                }
                catch (err) {
                    step = 6;
                    const newTable = yield newConnectionDatabase.model(schema, new mongoose_1.default.Schema({
                        id: String,
                        data: Object,
                    }));
                    yield newTable.deleteMany({});
                    yield newTable.insertMany(data);
                    step = 7.2;
                    if (!options || !options.hidelogs)
                        logger_1.logger.info(`Updated migration table`, {
                            label: "Migrations",
                        });
                }
                step = 8;
                newConnectionDatabase.close();
                step = 9;
                if (!options || !options.hidelogs)
                    logger_1.logger.info(`Migration successful`, {
                        label: "Migrations",
                    });
                const lastTiming = Date.now();
                return {
                    error: false,
                    date: Date.now(),
                    timeTaken: lastTiming - currentTiming,
                    table: schema,
                    dataCreated: data.length,
                };
            }
            catch (err) {
                if (!options || !options.hidelogs)
                    logger_1.logger.error(`Migration Error: ${err.message} on step ${step}`, {
                        label: "Migrations",
                    });
                return {
                    table: schema,
                    error: err,
                };
            }
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
                yield database_1.default.client.createCollection(tableName);
                database_1.default.tables.push(tableName);
            }
            this.table = database_1.default.client.collection(tableName);
            /**
             * @info Get the value of a key from the table
             * @param {string} key - The key to get the value of
             * @param {object} options - The options provided. Supports cache: true if the original cache was false
             * @returns {null | string | object | number | any} The value of the key
             * @throws {TypeError} If no key was specified
             */
            this.get = function (key, options) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!key)
                            throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                        let fetchedData;
                        if (options && options.cache)
                            database_1.default.enableCache();
                        if (database_1.default.cache &&
                            database_1.default.cache.has(this.table.name + "." + key) === true) {
                            fetchedData = database_1.default.cache.get(this.table.name + "." + key);
                        }
                        else {
                            let targetProvided;
                            if (key.includes(".")) {
                                let unparsedTarget = key.split(".");
                                key = unparsedTarget.shift();
                                targetProvided = unparsedTarget.join(".");
                            }
                            fetchedData = yield this.table.findOne({ id: key });
                            if (!fetchedData) {
                                return null;
                            }
                            fetchedData = fetchedData.data;
                            if (targetProvided) {
                                fetchedData = lodash_1.default.get(fetchedData, targetProvided);
                                if (database_1.default.cache || (options && options.cache))
                                    database_1.default.cache.set(this.table.name + "." + key + "." + targetProvided, fetchedData);
                            }
                            else {
                                if ((database_1.default.cache &&
                                    tableOptions &&
                                    tableOptions.cacheLargeData) ||
                                    (options && options.cache))
                                    database_1.default.cache.set(this.table.name + "." + key, fetchedData);
                            }
                        }
                        return fetchedData;
                    }
                    catch (err) {
                        if (tableOptions && tableOptions.catchErrors) {
                            logger_1.logger.error("[table.get()]: " + err.message, {
                                label: "Table",
                            });
                        }
                        return null;
                    }
                });
            };
            /**
             * @info Set the value of a key in the table
             * @param {string} key - The key to set the value of
             * @param {string | object | number} value - The value to set the key to
             * @param {object} options - The options provided. Supports cache: true if the original cache was false and returnData: true if you want the data to be returned
             * @returns {null | boolean | any} The result of the operation or the data if returnData is true, null for errors
             * @throws {TypeError} If no key or value was specified
             **/
            this.set = function (key, value, options) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!key)
                            throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                        if (!value && value != 0)
                            throw new TypeError("No value specified. Need Help ? Visit pogy.xyz/support");
                        const initialKey = key;
                        let targetProvided;
                        if (key.includes(".")) {
                            let unparsedTarget = key.split(".");
                            key = unparsedTarget.shift();
                            targetProvided = unparsedTarget.join(".");
                        }
                        if (options && options.cache)
                            database_1.default.enableCache();
                        if (targetProvided) {
                            if (database_1.default.cache || (options && options.cache))
                                database_1.default.cache.set(this.table.name + "." + key + "." + targetProvided, value);
                            yield this.table.updateOne({ id: key }, {
                                $set: {
                                    [targetProvided ? "data." + targetProvided : "data"]: value,
                                },
                            }, { upsert: true });
                        }
                        else {
                            if ((database_1.default.cache &&
                                tableOptions &&
                                tableOptions.cacheLargeData) ||
                                (options && options.cache))
                                database_1.default.cache.set(this.table.name + "." + key, value);
                            yield this.table.updateOne({ id: key }, {
                                $set: {
                                    [targetProvided ? "data." + targetProvided : "data"]: value,
                                },
                            }, { upsert: true });
                        }
                        if (options && options.returnData) {
                            return yield this.get(initialKey, options);
                        }
                        else
                            return true;
                    }
                    catch (err) {
                        if (tableOptions && tableOptions.catchErrors) {
                            logger_1.logger.error("[table.set()]: " + err.message, {
                                label: "Table",
                            });
                        }
                        return null;
                    }
                });
            };
            /**
             * @info Add a value to a key in the table
             * @param {string} key - The key to add the value to
             * @param {number | string | object} value - The value to add to the key
             * @param {object} options - The options provided. Supports cache: true if the original cache was false and returnData: true if you want the data to be returned
             * @returns {null | boolean | any} The result of the operation or the data if returnData is true, null for errors
             * @throws {TypeError} If no key or value was specified
             **/
            this.add = function (key, value, options) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!key)
                            throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                        if (isNaN(Number(value)))
                            throw new TypeError("Must specify value to add. Need Help ? Visit pogy.xyz/support");
                        const initialKey = key;
                        let targetProvided;
                        if (key.includes(".")) {
                            let unparsedTarget = key.split(".");
                            key = unparsedTarget.shift();
                            targetProvided = unparsedTarget.join(".");
                        }
                        if (isNaN(Number(value)))
                            return true;
                        value = parseInt(Number(value).toString());
                        if (options && options.cache)
                            database_1.default.enableCache();
                        if (targetProvided) {
                            if (database_1.default.cache || (options && options.cache)) {
                                if (database_1.default.cache.get(this.table.name + "." + key + "." + targetProvided)) {
                                    database_1.default.cache.set(this.table.name + "." + key + "." + targetProvided, database_1.default.cache.get(this.table.name + "." + key + "." + targetProvided) + value);
                                    yield this.table.updateOne({ id: key }, {
                                        $inc: {
                                            [targetProvided ? "data." + targetProvided : "data"]: value,
                                        },
                                    }, { upsert: true });
                                }
                                else {
                                    const dataFetched = yield this.table.findOneAndUpdate({ id: key }, {
                                        $inc: {
                                            [targetProvided ? "data." + targetProvided : "data"]: value,
                                        },
                                    }, { upsert: true, new: true });
                                    if (dataFetched &&
                                        dataFetched.value &&
                                        dataFetched.value.data) {
                                        const incrementedData = lodash_1.default.get(dataFetched.value.data, targetProvided);
                                        database_1.default.cache.set(this.table.name + "." + key + "." + targetProvided, incrementedData ? incrementedData : value);
                                    }
                                }
                            }
                            else {
                                yield this.table.updateOne({ id: key }, {
                                    $inc: {
                                        [targetProvided ? "data." + targetProvided : "data"]: value,
                                    },
                                }, { upsert: true });
                            }
                        }
                        else {
                            if ((database_1.default.cache &&
                                tableOptions &&
                                tableOptions.cacheLargeData) ||
                                (options && options.cache))
                                database_1.default.cache.set(this.table.name + "." + key, value);
                            yield this.table.updateOne({ id: key }, {
                                $inc: {
                                    [targetProvided ? "data." + targetProvided : "data"]: value,
                                },
                            }, { upsert: true });
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
                                label: "Table",
                            });
                        }
                        return null;
                    }
                });
            };
            /**
             * @info Subtract a value from a key in the table
             * @param {string} key - The key to subtract the value to
             * @param {string | object | number} value - The value to subtract from the key
             * @param {object} options - The options provided. Supports cache: true if the original cache was false and returnData: true if you want the data to be returned
             * @returns {null | boolean | any} The result of the operation or the data if returnData is true, null for errors
             * @throws {TypeError} If no key or value was specified
             **/
            this.subtract = function (key, value, options) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!key)
                            throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                        if (isNaN(Number(value)))
                            throw new TypeError("Must specify value to subtract. Need Help ? Visit pogy.xyz/support");
                        const initialKey = key;
                        let targetProvided;
                        if (key.includes(".")) {
                            let unparsedTarget = key.split(".");
                            key = unparsedTarget.shift();
                            targetProvided = unparsedTarget.join(".");
                        }
                        if (isNaN(Number(value)))
                            return true;
                        value = ~parseInt(Number(value).toString()) + 1;
                        if (options && options.cache)
                            database_1.default.enableCache();
                        if (targetProvided) {
                            if (database_1.default.cache || (options && options.cache)) {
                                if (database_1.default.cache.get(this.table.name + "." + key + "." + targetProvided)) {
                                    database_1.default.cache.set(this.table.name + "." + key + "." + targetProvided, database_1.default.cache.get(this.table.name + "." + key + "." + targetProvided) + value);
                                    yield this.table.updateOne({ id: key }, {
                                        $inc: {
                                            [targetProvided ? "data." + targetProvided : "data"]: value,
                                        },
                                    }, { upsert: true });
                                }
                                else {
                                    const dataFetched = yield this.table.findOneAndUpdate({ id: key }, {
                                        $inc: {
                                            [targetProvided ? "data." + targetProvided : "data"]: value,
                                        },
                                    }, { upsert: true, new: true });
                                    if (dataFetched &&
                                        dataFetched.value &&
                                        dataFetched.value.data) {
                                        const decrementedData = lodash_1.default.get(dataFetched.value.data, targetProvided);
                                        database_1.default.cache.set(this.table.name + "." + key + "." + targetProvided, decrementedData ? decrementedData : value);
                                    }
                                }
                            }
                            else {
                                yield this.table.updateOne({ id: key }, {
                                    $inc: {
                                        [targetProvided ? "data." + targetProvided : "data"]: value,
                                    },
                                }, { upsert: true });
                            }
                        }
                        else {
                            if ((database_1.default.cache &&
                                tableOptions &&
                                tableOptions.cacheLargeData) ||
                                (options && options.cache))
                                database_1.default.cache.set(this.table.name + "." + key, value);
                            yield this.table.updateOne({ id: key }, {
                                $inc: {
                                    [targetProvided ? "data." + targetProvided : "data"]: value,
                                },
                            }, { upsert: true });
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
                                label: "Table",
                            });
                        }
                        return null;
                    }
                });
            };
            /**
             * @info Check if a key exists in the table
             * @param {string} key - The key to check if exists
             * @returns {boolean | null} The result of the operation or null if an error occured
             * @throws {TypeError} If no key was specified
             **/
            this.has = function (key) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!key)
                            throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                        let targetProvided;
                        if (key.includes(".")) {
                            let unparsedTarget = key.split(".");
                            key = unparsedTarget.shift();
                            targetProvided = unparsedTarget.join(".");
                        }
                        let fetchedData = yield this.table.findOne({ id: key });
                        if (!fetchedData) {
                            return false;
                        }
                        fetchedData = fetchedData.data;
                        if (targetProvided) {
                            fetchedData = lodash_1.default.get(fetchedData, targetProvided);
                        }
                        return typeof fetchedData != "undefined";
                    }
                    catch (err) {
                        if (tableOptions && tableOptions.catchErrors) {
                            logger_1.logger.error("[table.has()]: " + err.message, {
                                label: "Table",
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
            this.delete = function (key) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!key)
                            throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                        let targetProvided;
                        if (key.includes(".")) {
                            let unparsedTarget = key.split(".");
                            key = unparsedTarget.shift();
                            targetProvided = unparsedTarget.join(".");
                        }
                        let fetchedData = yield this.table.findOne({ id: key });
                        if (!fetchedData) {
                            return null;
                        }
                        fetchedData = fetchedData.data;
                        if (typeof fetchedData === "object" && targetProvided) {
                            if (database_1.default.cache) {
                                database_1.default.cache.forEach((_, key_) => {
                                    if (key_.startsWith(this.table.name + "." + key + "." + targetProvided)) {
                                        database_1.default.cache.delete(key_);
                                    }
                                });
                            }
                            lodash_1.default.unset(fetchedData, targetProvided);
                            yield this.table.updateOne({ id: key }, { $set: { data: fetchedData } });
                            return true;
                        }
                        else if (targetProvided)
                            throw new TypeError("The target provided is not an object.");
                        else {
                            if (database_1.default.cache) {
                                database_1.default.cache.forEach((_, key_) => {
                                    if (key_.startsWith(this.table.name + "." + key)) {
                                        database_1.default.cache.delete(key_);
                                    }
                                });
                            }
                            yield this.table.deleteOne({ id: key });
                        }
                        return true;
                    }
                    catch (err) {
                        if (tableOptions && tableOptions.catchErrors) {
                            logger_1.logger.error("[table.delete()]: " + err.message, {
                                label: "Table",
                            });
                        }
                        return null;
                    }
                });
            };
            /**
             * @info Push or create a value to an array in the table
             * @param {string} key - The key to push the value to
             * @param {string | object | number} value - The value to push to the key
             * @param {object} options - The options provided. Supports cache: true if the original cache was false and returnData: true if you want the data to be returned
             * @returns {null | boolean | any} The result of the operation or the data if returnData is true, null for errors
             * @throws {TypeError} If no key or value was specified
             **/
            this.push = function (key, value, options) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!key)
                            throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                        if (!value && value != 0)
                            throw new TypeError("No value specified. Need Help ? Visit pogy.xyz/support");
                        const initialKey = key;
                        let targetProvided;
                        if (key.includes(".")) {
                            let unparsedTarget = key.split(".");
                            key = unparsedTarget.shift();
                            targetProvided = unparsedTarget.join(".");
                        }
                        yield this.table
                            .updateOne({ id: key }, {
                            $push: {
                                [targetProvided ? "data." + targetProvided : "data"]: value,
                            },
                        }, { upsert: true })
                            .then(() => __awaiter(this, void 0, void 0, function* () {
                            let fetchedData = (yield this.table.findOne({ id: key })).data;
                            if (targetProvided) {
                                fetchedData = lodash_1.default.get(fetchedData, targetProvided);
                                if (options && options.cache)
                                    database_1.default.enableCache();
                                if (database_1.default.cache || (options && options.cache))
                                    database_1.default.cache.set(this.table.name + "." + key + "." + targetProvided, fetchedData);
                            }
                            else {
                                if ((database_1.default.cache &&
                                    tableOptions &&
                                    tableOptions.cacheLargeData) ||
                                    (options && options.cache))
                                    database_1.default.cache.set(this.table.name + "." + key, fetchedData);
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
                                label: "Table",
                            });
                        }
                        return null;
                    }
                });
            };
            /**
             * @info Remove a value from an array in the table
             * @param {string} key - The key to remove the value from the array
             * @param {string | object | number} value - The value to remove to the key
             * @param {object} options - The options provided. Supports cache: true if the original cache was false and returnData: true if you want the data to be returned
             * @returns {null | boolean | any} The result of the operation or the data if returnData is true, null for errors
             * @throws {TypeError} If no key or value was specified
             **/
            this.pull = function (key, value, options) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!key)
                            throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                        if (!value && value != 0)
                            throw new TypeError("No value specified. Need Help ? Visit pogy.xyz/support");
                        const initialKey = key;
                        let targetProvided;
                        if (key.includes(".")) {
                            let unparsedTarget = key.split(".");
                            key = unparsedTarget.shift();
                            targetProvided = unparsedTarget.join(".");
                        }
                        yield this.table
                            .updateOne({ id: key }, {
                            $pull: {
                                [targetProvided ? "data." + targetProvided : "data"]: value,
                            },
                        }, { upsert: true })
                            .then(() => __awaiter(this, void 0, void 0, function* () {
                            let fetchedData = (yield this.table.findOne({ id: key })).data;
                            if (targetProvided) {
                                fetchedData = lodash_1.default.get(fetchedData, targetProvided);
                                if (options && options.cache)
                                    database_1.default.enableCache();
                                if (database_1.default.cache || (options && options.cache))
                                    database_1.default.cache.set(this.table.name + "." + key + "." + targetProvided, fetchedData);
                            }
                            else {
                                if ((database_1.default.cache &&
                                    tableOptions &&
                                    tableOptions.cacheLargeData) ||
                                    (options && options.cache))
                                    database_1.default.cache.set(this.table.name + "." + key, fetchedData);
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
                                label: "Table",
                            });
                        }
                        return null;
                    }
                });
            };
            /**
             * @info Fetch all the schemas from the table
             * @param {TableAllOptions} options - The options to fetch the schemas with
             * @returns {object | any} The schemas from the table
             * @throws {TypeError} If no key was specified
             **/
            this.all = function (options) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        let fetchedData = yield this.table.find().toArray();
                        if (options && options.documentForm) {
                            return fetchedData;
                        }
                        let data = {};
                        fetchedData.forEach((i) => __awaiter(this, void 0, void 0, function* () {
                            data[i.id] = i.data;
                        }));
                        return data;
                    }
                    catch (err) {
                        if (tableOptions && tableOptions.catchErrors) {
                            logger_1.logger.error("[table.all()]: " + err.message, {
                                label: "Table",
                            });
                        }
                        return {};
                    }
                });
            };
            /**
             * @info Delete all the schemas from the table
             * @returns {boolean} The result of the operation, null if an error occured
             * @throws {TypeError} If no key was specified
             **/
            this.drop = function () {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (database_1.default.cache) {
                            database_1.default.cache.forEach((_, key) => {
                                if (key.startsWith(this.table.name)) {
                                    database_1.default.cache.delete(key);
                                }
                            });
                        }
                        yield this.table.drop();
                        return true;
                    }
                    catch (err) {
                        if (tableOptions && tableOptions.catchErrors) {
                            logger_1.logger.error("[table.drop()]: " + err.message, {
                                label: "Table",
                            });
                        }
                        return null;
                    }
                });
            };
            return this;
        }))();
    },
};
