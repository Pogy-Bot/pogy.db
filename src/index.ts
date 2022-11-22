/* eslint-disable @typescript-eslint/no-explicit-any */
import DatabaseManager from "./database";
import _ from "lodash";
import mongoose from "mongoose";
import modelSchema from "./database/collection";
import CacheService from "./database/CacheService";
import { logger } from "./logger";
import type { Options, migrateOptions, migrationObject, TableAllOptions, CustomizedTable, PingResult, pingOptions, AllData } from "./types";

export = {
    DatabaseManager: DatabaseManager,

    /**
     * @info check if the database is online
     * @returns {boolean} true if the database is online
     */
    isOnline: (): boolean => {
        return DatabaseManager.client ? true : false;
    },

    /**
     * @info Initiate the connection to mongo db
     * @param {string} url - The url of the mongo db
     * @param {Options} options - The options for the mongo db
     */
    connect: async function (url: string, options?: Options, databaseOptions?: mongoose.ConnectOptions) {
        if (!url) throw new TypeError("A database url was not provided.");

        const connection = await DatabaseManager.initMongo(url, options, databaseOptions);

        DatabaseManager.tables = (await connection.db.listCollections().toArray()).map((i) => i.name);

        return true;
    },

    /**
     * @info Get the execution time of your queries.
     * @param {pingOptions} options - The ping options
     * @returns {PingResult | boolean} - The ping result or false if the data or table is not found
     * @throws {TypeError} - If one of the options are missing
     */
    ping: async function (options: pingOptions): Promise<PingResult | boolean> {
        if (!options) throw new TypeError("Ping options were not provided.");
        if (!options.tableName) throw new TypeError("A table name was not provided.");
        if (!options.dataToGet) throw new TypeError("A data to get was not provided.");
        if (!this.isOnline()) return false;
        if (!DatabaseManager.tables.includes(options.tableName)) return false;

        const functions = [
            async () => {
                const currentTime_table = performance.now();
                const table = await new this.table(options.tableName);
                const endTime_table = performance.now();

                if (!table) return false;
                const currentTime_data = performance.now();
                const dataToGet = await table.get(options.dataToGet);
                const endTime_data = performance.now();
                if (!dataToGet) return false;

                const timeToGetTable = endTime_table - currentTime_table;
                const timeToGetData = endTime_data - currentTime_data;

                return {
                    timeToGetTable: timeToGetTable,
                    timeToGetData: timeToGetData
                };
            },
            async () => {
                if (DatabaseManager.redis) {
                    const currentTime = performance.now();
                    await DatabaseManager.redis.ping();
                    const endTime = performance.now();
                    return endTime - currentTime;
                } else return "Redis is not enabled.";
            }
        ];

        const results: unknown = await Promise.all(functions.map((f) => new Promise((resolve) => resolve(f()))));

        if (!results[0]) {
            logger.warn("The data or table was not found.", {
                label: "Database"
            });

            return {
                cached: DatabaseManager.cache ? true : false,
                tableName: options.tableName,
                dataToGet: options.dataToGet,
                timeToGetTable: 0,
                timeToGetData: 0,
                redisPing: results[1],
                totalPing: 0 + (typeof results[1] === "number" ? results[1] : 0)
            };
        }

        return {
            cached: DatabaseManager.cache ? true : false,
            tableName: options.tableName,
            dataToGet: options.dataToGet,
            timeToGetTable: results[0].timeToGetTable,
            timeToGetData: results[0].timeToGetData,
            redisPing: results[1],
            totalPing: results[0].timeToGetTable + results[0].timeToGetData + (typeof results[1] === "number" ? results[1] : 0)
        };
    },

    /**
     * @info Copy the database to another connection
     * @param {string} schema - The schema to migrate to.
     * @param {string} newConnection - The new database connection.
     * @returns {migrationObject} - The migrated data.
     */
    migrate: async function (schema: string, newConnection: string, options?: migrateOptions): Promise<migrationObject> {
        const errors = [];
        const currentTiming = Date.now();
        const isLogsHidden = !options || (options.logs && options.logs.hidden !== true);

        if (!this.isOnline()) {
            if (isLogsHidden)
                logger.error(`Unable to migrate since the database was offline`, {
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

        async function migrate() {
            let step = 0;
            try {
                if (isLogsHidden)
                    logger.info(`Preparing to migrate schema: "${schema}"`, {
                        label: "Migrations"
                    });

                const DateNow = Date.now();
                step = 1;
                const data = await (
                    await new this.table(schema)
                ).all({
                    documentForm: true
                });

                step = 2;
                if (isLogsHidden)
                    logger.info(`Fetched data in ${Date.now() - DateNow}ms`, {
                        label: "Migrations"
                    });
                step = 3;
                const newConnectionDatabase = await mongoose.createConnection(newConnection);
                step = 4;
                try {
                    step = 5;
                    const newTable = await newConnectionDatabase.createCollection(schema);
                    await newTable.insertMany(data);
                    step = 7.1;
                    if (isLogsHidden)
                        logger.info(`Created migration table`, {
                            label: "Migrations"
                        });
                } catch (err) {
                    step = 6;
                    const newTable = await newConnectionDatabase.model(
                        schema,
                        new mongoose.Schema({
                            id: String,
                            data: Object
                        })
                    );
                    await newTable.deleteMany({});
                    await newTable.insertMany(data);
                    step = 7.2;
                    if (isLogsHidden)
                        logger.info(`Updated migration table`, {
                            label: "Migrations"
                        });
                }

                step = 8;
                newConnectionDatabase.close();

                step = 9;
                if (isLogsHidden)
                    logger.info(`Migration successful`, {
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
            } catch (err) {
                if (isLogsHidden)
                    logger.error(`Migration Error: ${err.message} on step ${step}`, {
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
        }

        return await migrate();
    },

    /**
     * Get a table from the database
     * @param {string} table - The name of the table
     * @returns {CustomizedTable | any} The table object
     * @throws {TypeError} If the table encounters an error
     */
    table: function (
        tableName: string,
        tableOptions?: {
            cacheLargeData?: boolean;
            catchErrors?: boolean;
            watchDeletions?: boolean;
        }
    ): Promise<CustomizedTable | any> {
        return (async () => {
            if (!DatabaseManager.client) return false;
            if (typeof tableName !== "string") throw new TypeError("Table name has to be a string. Need Help ? Visit pogy.xyz/support");
            else if (tableName.includes(" ")) throw new TypeError("Table name cannot include spaces. Need Help ? Visit pogy.xyz/support");

            if (!DatabaseManager.tables.includes(tableName)) {
                DatabaseManager.tables.push(tableName);
            }

            // create or fetch a table
            this.table = modelSchema(DatabaseManager.client, tableName);

            // init the table to the mongoose watch
            if (tableOptions && tableOptions?.watchDeletions) CacheService.init(this.table);

            /**
             * @info Get the value of a key from the table
             * @param {string} key - The key to get the value of
             * @param {object} options - The options provided. Supports cache: true if the original cache was false
             * @returns {null | string | number | unknown} The value of the key
             * @throws {TypeError} If no key was specified
             */
            this.get = async function (
                key: string,
                options?: {
                    cache?: {
                        toggle?: boolean;
                        cacheOnly?: boolean;
                    };
                }
            ): Promise<null | string | number | unknown> {
                try {
                    if (!key) throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                    if ((options?.cache?.cacheOnly || DatabaseManager?.options?.cache?.cacheOnly) && !(options?.cache?.toggle || DatabaseManager?.options?.cache?.toggle)) {
                        throw new TypeError("Make sure to enable the cache for this function before using cacheOnly. Need Help ? Visit pogy.xyz/support");
                    }

                    let fetchedData;
                    const isCacheEnabled = DatabaseManager.isCacheEnabled(options);
                    if (isCacheEnabled && !DatabaseManager.cache) DatabaseManager.enableCache();

                    if (isCacheEnabled) {
                        if (!DatabaseManager.redis && DatabaseManager.cache.has(this.table.collection.name + "." + key) === true) {
                            fetchedData = DatabaseManager.cache.get(this.table.collection.name + "." + key);
                        } else {
                            if (DatabaseManager.redis) {
                                try {
                                    fetchedData = await DatabaseManager.redis.json.get(this.table.collection.name + "." + key);
                                } catch (err) {
                                    fetchedData = await DatabaseManager.redis.get(this.table.collection.name + "." + key);
                                }
                            }
                        }
                    }

                    if (!fetchedData && (options?.cache?.cacheOnly || DatabaseManager?.options?.cache?.cacheOnly)) return null;

                    if (!fetchedData) {
                        let targetProvided: string;
                        if (key.includes(".")) {
                            const unparsedTarget = key.split(".");
                            key = unparsedTarget.shift();
                            targetProvided = unparsedTarget.join(".");
                        }

                        fetchedData = await this.table.findOne({ id: key });
                        if (!fetchedData || (fetchedData.expireAt && fetchedData.expireAt.getTime() - Date.now() <= 0)) {
                            return null;
                        }

                        fetchedData = fetchedData.data;

                        if (targetProvided) {
                            fetchedData = _.get(fetchedData, targetProvided);
                            if (isCacheEnabled) {
                                if (DatabaseManager.redis) {
                                    if (typeof fetchedData === "object") {
                                        try {
                                            await DatabaseManager.redis.json.set(this.table.collection.name + "." + key + "." + targetProvided, "$", fetchedData);
                                        } catch (err) {
                                            await DatabaseManager.redis.del(this.table.collection.name + "." + key + "." + targetProvided);
                                            await DatabaseManager.redis.json.set(this.table.collection.name + "." + key + "." + targetProvided, "$", fetchedData);
                                        }
                                    } else {
                                        await DatabaseManager.redis.set(this.table.collection.name + "." + key + "." + targetProvided, typeof fetchedData + ":" + fetchedData);
                                    }
                                } else {
                                    DatabaseManager.cache.set(this.table.collection.name + "." + key + "." + targetProvided, fetchedData);
                                }
                            }
                        } else {
                            if (isCacheEnabled && tableOptions && tableOptions.cacheLargeData) {
                                if (DatabaseManager.redis) {
                                    if (typeof fetchedData === "object") {
                                        try {
                                            await DatabaseManager.redis.json.set(this.table.collection.name + "." + key, "$", fetchedData);
                                        } catch (err) {
                                            await DatabaseManager.redis.del(this.table.collection.name + "." + key);
                                            await DatabaseManager.redis.json.set(this.table.collection.name + "." + key, "$", fetchedData);
                                        }
                                    } else {
                                        await DatabaseManager.redis.set(this.table.collection.name + "." + key, typeof fetchedData + ":" + fetchedData);
                                    }
                                } else {
                                    DatabaseManager.cache.set(this.table.collection.name + "." + key, fetchedData);
                                }
                            }
                        }
                    }

                    if (DatabaseManager.redis && fetchedData) {
                        if (typeof fetchedData === "string") {
                            fetchedData = CacheService.parseRedis(fetchedData);
                        }
                    }

                    return fetchedData;
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.log(err);
                    if (tableOptions && tableOptions.catchErrors) {
                        logger.error("[table.get()]: " + err.message, {
                            label: "Table"
                        });
                    }
                    return null;
                }
            };

            /**
             * @info Set the value of a key in the table
             * @param {string} key - The key to set the value of
             * @param {string | number | boolean | unknown} value - The value to set the key to
             * @param {object} options - The options provided. Supports cache: true if the original cache was false and returnData: true if you want the data to be returned
             * @returns {null | boolean | any} The result of the operation or the data if returnData is true, null for errors
             * @throws {TypeError} If no key or value was specified
             **/
            this.set = async function (
                key: string,
                value: string | number | boolean | unknown,
                options?: {
                    cache?: {
                        toggle?: boolean;
                        cacheOnly?: boolean;
                    };
                    returnData?: boolean;
                    database?: {
                        ttl?: number;
                    };
                    redis?: {
                        ttl?: number;
                    };
                }
            ): Promise<null | boolean | unknown> {
                try {
                    if (!key) throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                    if (!value) value = null;

                    if ((options?.cache?.cacheOnly || DatabaseManager?.options?.cache?.cacheOnly) && !(options?.cache?.toggle || DatabaseManager?.options?.cache?.toggle)) {
                        throw new TypeError("Make sure to enable the cache for this function before using cacheOnly. Need Help ? Visit pogy.xyz/support");
                    }

                    const initialKey = key;
                    let targetProvided: string;
                    if (key.includes(".")) {
                        const unparsedTarget = key.split(".");
                        key = unparsedTarget.shift();
                        targetProvided = unparsedTarget.join(".");
                    }

                    const isCacheEnabled = DatabaseManager.isCacheEnabled(options);
                    if (isCacheEnabled && !DatabaseManager.cache) DatabaseManager.enableCache();

                    if (targetProvided) {
                        if (isCacheEnabled) {
                            if (DatabaseManager.redis) {
                                const redisTTL = options?.redis?.ttl ?? -1;

                                if (typeof value === "object" && value) {
                                    try {
                                        await DatabaseManager.redis.json.set(this.table.collection.name + "." + key + "." + targetProvided, "$", value);
                                    } catch (err) {
                                        await DatabaseManager.redis.del(this.table.collection.name + "." + key + "." + targetProvided);
                                        await DatabaseManager.redis.json.set(this.table.collection.name + "." + key + "." + targetProvided, "$", value);
                                    }
                                } else {
                                    await DatabaseManager.redis.set(this.table.collection.name + "." + key + "." + targetProvided, typeof value + ":" + value);
                                }

                                if (redisTTL !== -1) await DatabaseManager.redis.expire(this.table.collection.name + "." + key + "." + targetProvided, redisTTL);
                            } else {
                                DatabaseManager.cache.set(this.table.collection.name + "." + key + "." + targetProvided, value);
                            }
                        }

                        if (!(options?.cache?.cacheOnly || DatabaseManager?.options?.cache?.cacheOnly)) {
                            await this.table.updateOne(
                                { id: key },
                                {
                                    $set: CacheService.shouldExpire(options?.database?.ttl)
                                        ? {
                                              [targetProvided ? "data." + targetProvided : "data"]: value,
                                              expireAt: CacheService.createDuration(options.database.ttl * 1000)
                                          }
                                        : {
                                              [targetProvided ? "data." + targetProvided : "data"]: value
                                          }
                                },
                                { upsert: true }
                            );
                        }
                    } else {
                        if (isCacheEnabled && tableOptions && tableOptions.cacheLargeData) {
                            if (DatabaseManager.redis) {
                                const redisTTL = options?.redis?.ttl ?? -1;

                                if (typeof value === "object" && value) {
                                    try {
                                        await DatabaseManager.redis.json.set(this.table.collection.name + "." + key, "$", value);
                                    } catch (err) {
                                        await DatabaseManager.redis.del(this.table.collection.name + "." + key);
                                        await DatabaseManager.redis.json.set(this.table.collection.name + "." + key, "$", value);
                                    }
                                } else {
                                    await DatabaseManager.redis.set(this.table.collection.name + "." + key, typeof value + ":" + value);
                                }

                                if (redisTTL !== -1) await DatabaseManager.redis.expire(this.table.collection.name + "." + key + "." + targetProvided, redisTTL);
                            } else DatabaseManager.cache.set(this.table.collection.name + "." + key, value);
                        }

                        if (!(options?.cache?.cacheOnly || DatabaseManager?.options?.cache?.cacheOnly)) {
                            await this.table.updateOne(
                                { id: key },
                                {
                                    $set: CacheService.shouldExpire(options?.database?.ttl)
                                        ? {
                                              expireAt: CacheService.createDuration(options.database.ttl * 1000),
                                              [targetProvided ? "data." + targetProvided : "data"]: value
                                          }
                                        : {
                                              [targetProvided ? "data." + targetProvided : "data"]: value
                                          }
                                },
                                { upsert: true }
                            );
                        }
                    }

                    if (options?.database?.ttl && isCacheEnabled && tableOptions?.watchDeletions) {
                        const table = await this.table.findOne({ id: key });
                        if (table) {
                            CacheService.setCache({
                                key: this.table.collection.name + "." + initialKey,
                                id: table._id.toString()
                            });
                        }
                    }

                    if (options && options.returnData) {
                        return await this.get(initialKey, options);
                    } else return true;
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.log(err);
                    if (tableOptions && tableOptions.catchErrors) {
                        logger.error("[table.set()]: " + err.message, {
                            label: "Table"
                        });
                    }
                    return null;
                }
            };

            /**
             * @info Add a value to a key in the table
             * @param {string} key - The key to add the value to
             * @param {number | string} value - The value to add to the key
             * @param {object} options - The options provided. Supports cache: true if the original cache was false and returnData: true if you want the data to be returned
             * @returns {null | boolean | unknown} The result of the operation or the data if returnData is true, null for errors
             * @throws {TypeError} If no key or value was specified
             **/
            this.add = async function (
                key: string,
                value: number | string,
                options?: {
                    cache?: {
                        toggle?: boolean;
                        cacheOnly?: boolean;
                    };
                    returnData?: boolean;
                }
            ): Promise<null | boolean | unknown> {
                try {
                    if (!key) throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                    if (isNaN(Number(value))) throw new TypeError("Must specify value to add. Need Help ? Visit pogy.xyz/support");

                    const initialKey = key;
                    let targetProvided: string;

                    if (key.includes(".")) {
                        const unparsedTarget = key.split(".");
                        key = unparsedTarget.shift();
                        targetProvided = unparsedTarget.join(".");
                    }

                    if (isNaN(Number(value))) return true;
                    value = parseInt(Number(value).toString());

                    const isCacheEnabled = DatabaseManager.isCacheEnabled(options);
                    if (isCacheEnabled && !DatabaseManager.cache) DatabaseManager.enableCache();

                    if ((options?.cache?.cacheOnly || DatabaseManager?.options?.cache?.cacheOnly) && !(options?.cache?.toggle || DatabaseManager?.options?.cache?.toggle)) {
                        throw new TypeError("Make sure to enable the cache for this function before using cacheOnly. Need Help ? Visit pogy.xyz/support");
                    }

                    if (targetProvided) {
                        if (isCacheEnabled) {
                            if (DatabaseManager.redis) {
                                const addedVal = await this.get(key + "." + targetProvided, options);
                                if (addedVal) {
                                    await DatabaseManager.redis.set(this.table.collection.name + "." + key + "." + targetProvided, "number:" + Number(Number(addedVal) + value));
                                } else {
                                    await DatabaseManager.redis.set(this.table.collection.name + "." + key + "." + targetProvided, "number:" + value);
                                }

                                if (!(options?.cache?.cacheOnly || DatabaseManager?.options?.cache?.cacheOnly)) {
                                    await this.table.updateOne(
                                        { id: key },
                                        {
                                            $inc: {
                                                [targetProvided ? "data." + targetProvided : "data"]: value
                                            }
                                        },
                                        { upsert: true }
                                    );
                                }
                            } else {
                                if (DatabaseManager.cache.get(this.table.collection.name + "." + key + "." + targetProvided)) {
                                    DatabaseManager.cache.set(this.table.collection.name + "." + key + "." + targetProvided, DatabaseManager.cache.get(this.table.collection.name + "." + key + "." + targetProvided) + value);

                                    if (!(options?.cache?.cacheOnly || DatabaseManager?.options?.cache?.cacheOnly)) {
                                        await this.table.updateOne(
                                            { id: key },
                                            {
                                                $inc: {
                                                    [targetProvided ? "data." + targetProvided : "data"]: value
                                                }
                                            },
                                            { upsert: true }
                                        );
                                    }
                                } else {
                                    const dataFetched = await this.table.findOneAndUpdate(
                                        { id: key },
                                        {
                                            $inc: {
                                                [targetProvided ? "data." + targetProvided : "data"]: value
                                            }
                                        },
                                        { upsert: true, new: true }
                                    );

                                    if (dataFetched && dataFetched.value && dataFetched.value.data) {
                                        const incrementedData = _.get(dataFetched.value.data, targetProvided);

                                        DatabaseManager.cache.set(this.table.collection.name + "." + key + "." + targetProvided, incrementedData ? incrementedData : value);
                                    }
                                }
                            }
                        } else {
                            if (!(options?.cache?.cacheOnly || DatabaseManager?.options?.cache?.cacheOnly)) {
                                await this.table.updateOne(
                                    { id: key },
                                    {
                                        $inc: {
                                            [targetProvided ? "data." + targetProvided : "data"]: value
                                        }
                                    },
                                    { upsert: true }
                                );
                            }
                        }
                    } else {
                        if (isCacheEnabled && tableOptions && tableOptions.cacheLargeData) {
                            if (DatabaseManager.redis) {
                                const addedVal = await this.get(key, options);
                                if (addedVal) {
                                    await DatabaseManager.redis.set(this.table.collection.name + "." + key, "number:" + Number(Number(addedVal) + value));
                                } else {
                                    await DatabaseManager.redis.set(this.table.collection.name + "." + key, "number:" + value);
                                }
                            } else {
                                DatabaseManager.cache.set(this.table.collection.name + "." + key, (DatabaseManager.cache.get(this.table.collection.name + "." + key) || 0) + value);
                            }
                        }

                        if (!(options?.cache?.cacheOnly || DatabaseManager?.options?.cache?.cacheOnly)) {
                            await this.table.updateOne(
                                { id: key },
                                {
                                    $inc: {
                                        [targetProvided ? "data." + targetProvided : "data"]: value
                                    }
                                },
                                { upsert: true }
                            );
                        }
                    }

                    if (options && options.returnData) {
                        return await this.get(initialKey, options);
                    } else return true;
                } catch (err) {
                    if (tableOptions && tableOptions.catchErrors) {
                        logger.error("[table.add()]: " + err.message, {
                            label: "Table"
                        });
                    }
                    return null;
                }
            };

            /**
             * @info Subtract a value from a key in the table
             * @param {string} key - The key to subtract the value to
             * @param {number | string} value - The value to subtract from the key
             * @param {object} options - The options provided. Supports cache: true if the original cache was false and returnData: true if you want the data to be returned
             * @returns {null | boolean | any} The result of the operation or the data if returnData is true, null for errors
             * @throws {TypeError} If no key or value was specified
             **/
            this.subtract = async function (
                key: string,
                value: number | string,
                options?: {
                    cache?: {
                        toggle?: boolean;
                        cacheOnly?: boolean;
                    };
                    returnData?: boolean;
                }
            ): Promise<null | boolean | unknown> {
                try {
                    if (!key) throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                    if (isNaN(Number(value))) throw new TypeError("Must specify value to subtract. Need Help ? Visit pogy.xyz/support");

                    if ((options?.cache?.cacheOnly || DatabaseManager?.options?.cache?.cacheOnly) && !(options?.cache?.toggle || DatabaseManager?.options?.cache?.toggle)) {
                        throw new TypeError("Make sure to enable the cache for this function before using cacheOnly. Need Help ? Visit pogy.xyz/support");
                    }

                    const initialKey = key;
                    let targetProvided: string;

                    if (key.includes(".")) {
                        const unparsedTarget = key.split(".");
                        key = unparsedTarget.shift();
                        targetProvided = unparsedTarget.join(".");
                    }
                    if (isNaN(Number(value))) return true;
                    // eslint-disable-next-line no-bitwise
                    value = ~parseInt(Number(value).toString()) + 1;

                    const isCacheEnabled = DatabaseManager.isCacheEnabled(options);
                    if (isCacheEnabled && !DatabaseManager.cache) DatabaseManager.enableCache();

                    if (targetProvided) {
                        if (isCacheEnabled) {
                            if (DatabaseManager.redis) {
                                const addedVal = await this.get(key + "." + targetProvided, options);
                                if (addedVal) {
                                    await DatabaseManager.redis.set(this.table.collection.name + "." + key + "." + targetProvided, "number:" + Number(Number(addedVal) + value));
                                } else {
                                    await DatabaseManager.redis.set(this.table.collection.name + "." + key + "." + targetProvided, "number:" + value);
                                }

                                if (!(options?.cache?.cacheOnly || DatabaseManager?.options?.cache?.cacheOnly)) {
                                    await this.table.updateOne(
                                        { id: key },
                                        {
                                            $inc: {
                                                [targetProvided ? "data." + targetProvided : "data"]: value
                                            }
                                        },
                                        { upsert: true }
                                    );
                                }
                            } else {
                                if (DatabaseManager.cache.get(this.table.collection.name + "." + key + "." + targetProvided)) {
                                    DatabaseManager.cache.set(this.table.collection.name + "." + key + "." + targetProvided, DatabaseManager.cache.get(this.table.collection.name + "." + key + "." + targetProvided) + value);

                                    if (!(options?.cache?.cacheOnly || DatabaseManager?.options?.cache?.cacheOnly)) {
                                        await this.table.updateOne(
                                            { id: key },
                                            {
                                                $inc: {
                                                    [targetProvided ? "data." + targetProvided : "data"]: value
                                                }
                                            },
                                            { upsert: true }
                                        );
                                    }
                                } else if (!(options?.cache?.cacheOnly || DatabaseManager?.options?.cache?.cacheOnly)) {
                                    const dataFetched = await this.table.findOneAndUpdate(
                                        { id: key },
                                        {
                                            $inc: {
                                                [targetProvided ? "data." + targetProvided : "data"]: value
                                            }
                                        },
                                        { upsert: true, new: true }
                                    );

                                    if (dataFetched && dataFetched.value && dataFetched.value.data) {
                                        const decrementedData = _.get(dataFetched.value.data, targetProvided);

                                        DatabaseManager.cache.set(this.table.collection.name + "." + key + "." + targetProvided, decrementedData ? decrementedData : value);
                                    }
                                }
                            }
                        } else if (!(options?.cache?.cacheOnly || DatabaseManager?.options?.cache?.cacheOnly)) {
                            await this.table.updateOne(
                                { id: key },
                                {
                                    $inc: {
                                        [targetProvided ? "data." + targetProvided : "data"]: value
                                    }
                                },
                                { upsert: true }
                            );
                        }
                    } else {
                        if (isCacheEnabled && tableOptions && tableOptions.cacheLargeData) {
                            if (DatabaseManager.redis) {
                                const addedVal = await this.get(key, options);
                                if (addedVal) {
                                    await DatabaseManager.redis.set(this.table.collection.name + "." + key, "number:" + Number(Number(addedVal) + value));
                                } else {
                                    await DatabaseManager.redis.set(this.table.collection.name + "." + key, "number:" + value);
                                }
                            } else {
                                DatabaseManager.cache.set(this.table.collection.name + "." + key, (DatabaseManager.cache.get(this.table.collection.name + "." + key) || 0) + value);
                            }
                        }

                        if (!(options?.cache?.cacheOnly || DatabaseManager?.options?.cache?.cacheOnly)) {
                            await this.table.updateOne(
                                { id: key },
                                {
                                    $inc: {
                                        [targetProvided ? "data." + targetProvided : "data"]: value
                                    }
                                },
                                { upsert: true }
                            );
                        }
                    }

                    if (options && options.returnData) {
                        return await this.get(initialKey, options);
                    } else return true;
                } catch (err) {
                    if (tableOptions && tableOptions.catchErrors) {
                        logger.error("[table.subtract()]: " + err.message, {
                            label: "Table"
                        });
                    }
                    return null;
                }
            };

            /**
             * @info Check if a key exists in the table (database) not cache
             * @param {string} key - The key to check if exists
             * @returns {boolean | null} The result of the operation or null if an error occured
             * @throws {TypeError} If no key was specified
             **/
            this.has = async function (
                key: string,
                options?: {
                    cache?: {
                        cacheOnly?: boolean;
                    };
                }
            ): Promise<boolean | null> {
                try {
                    if (!key) throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                    let targetProvided: string;
                    if (key.includes(".")) {
                        const unparsedTarget = key.split(".");
                        key = unparsedTarget.shift();
                        targetProvided = unparsedTarget.join(".");
                    }
                    if (options?.cache?.cacheOnly || DatabaseManager?.options?.cache?.cacheOnly) {
                        if (DatabaseManager.redis) {
                            try {
                                const data = await DatabaseManager.redis.json.get(this.table.collection.name + "." + key + "." + targetProvided);
                                if (data) return true;
                                else return false;
                            } catch (err) {
                                const data = await DatabaseManager.redis.get(this.table.collection.name + "." + key + "." + targetProvided);
                                if (data) return true;
                                else return false;
                            }
                        } else {
                            if (DatabaseManager.cache.has(this.table.collection.name + "." + key + "." + targetProvided)) return true;
                            else return false;
                        }
                    } else {
                        let fetchedData = await this.table.findOne({ id: key });
                        if (!fetchedData) {
                            return false;
                        }
                        fetchedData = fetchedData.data;
                        if (targetProvided) {
                            fetchedData = _.get(fetchedData, targetProvided);
                        }
                        return typeof fetchedData !== "undefined";
                    }
                } catch (err) {
                    if (tableOptions && tableOptions.catchErrors) {
                        logger.error("[table.has()]: " + err.message, {
                            label: "Table"
                        });
                    }
                    return null;
                }
            };

            /**
             * @info Delete a key from the table
             * @param {string} key - The key to delete
             * @returns {boolean | null} The result of the operation, null if the table was not found or an error occured
             * @throws {TypeError} If no key was specified or the traget provided is not an object
             **/
            this.delete = async function (
                key: string,
                options?: {
                    cache?: {
                        cacheOnly?: boolean;
                    };
                }
            ): Promise<boolean | null> {
                try {
                    if (!key) throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                    let targetProvided: string;
                    if (key.includes(".")) {
                        const unparsedTarget = key.split(".");
                        key = unparsedTarget.shift();
                        targetProvided = unparsedTarget.join(".");
                    }

                    if (!(options?.cache?.cacheOnly || DatabaseManager?.options?.cache?.cacheOnly)) {
                        let fetchedData = await this.table.findOne({ id: key });
                        if (!fetchedData) {
                            return null;
                        }
                        fetchedData = fetchedData.data;
                        if (typeof fetchedData === "object" && targetProvided) {
                            if (DatabaseManager.cache) {
                                if (!DatabaseManager.redis) {
                                    const keys = [...DatabaseManager.cache.keys()].filter((key_) => key_.startsWith(this.table.collection.name + "." + key + "." + targetProvided));
                                    for (const key__ of keys) {
                                        DatabaseManager.cache.delete(key__);
                                    }
                                } else {
                                    const keys = await DatabaseManager.redis.keys(this.table.collection.name + "." + key + "." + targetProvided + "*");
                                    for (let i = 0; i < keys.length; i++) {
                                        await DatabaseManager.redis.del(keys[i]);
                                    }
                                }
                            }

                            _.unset(fetchedData, targetProvided);
                            await this.table.updateOne({ id: key }, { $set: { data: fetchedData } });

                            return true;
                        } else if (targetProvided) throw new TypeError("The target provided is not an object.");
                        else {
                            if (DatabaseManager.cache) {
                                if (!DatabaseManager.redis) {
                                    DatabaseManager.cache.forEach((_, key_) => {
                                        if (key_.startsWith(this.table.collection.name + "." + key)) {
                                            DatabaseManager.cache.delete(key_);
                                        }
                                    });
                                } else {
                                    const keys = await DatabaseManager.redis.keys(this.table.collection.name + "." + key + "*");
                                    for (let i = 0; i < keys.length; i++) {
                                        await DatabaseManager.redis.del(keys[i]);
                                    }
                                }
                            }
                            await this.table.deleteOne({ id: key });
                        }
                        return true;
                    } else {
                        if (DatabaseManager.cache) {
                            if (!DatabaseManager.redis) {
                                DatabaseManager.cache.forEach((_, key_) => {
                                    if (key_.startsWith(this.table.collection.name + "." + key)) {
                                        DatabaseManager.cache.delete(key_);
                                    }
                                });
                            } else {
                                const keys = await DatabaseManager.redis.keys(this.table.collection.name + "." + key + "*");
                                for (let i = 0; i < keys.length; i++) {
                                    await DatabaseManager.redis.del(keys[i]);
                                }
                            }
                        }
                        return true;
                    }
                } catch (err) {
                    if (tableOptions && tableOptions.catchErrors) {
                        logger.error("[table.delete()]: " + err.message, {
                            label: "Table"
                        });
                    }
                    return null;
                }
            };

            /**
             * @info Push or create a value to an array in the table
             * @param {string} key - The key to push the value to
             * @param {string | number | boolean | unknown} value - The value to push to the key
             * @param {object} options - The options provided. Supports cache: true if the original cache was false and returnData: true if you want the data to be returned
             * @returns {null | boolean | unknown} The result of the operation or the data if returnData is true, null for errors
             * @throws {TypeError} If no key or value was specified
             **/
            this.push = async function (
                key: string,
                value: string | number | boolean | unknown,
                options?: {
                    cache?: {
                        toggle?: boolean;
                    };
                    returnData?: boolean;
                }
            ): Promise<null | boolean | unknown> {
                try {
                    if (!key) throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                    if (!value && value !== 0) throw new TypeError("No value specified. Need Help ? Visit pogy.xyz/support");

                    const initialKey = key;

                    let targetProvided: string;
                    if (key.includes(".")) {
                        const unparsedTarget = key.split(".");
                        key = unparsedTarget.shift();
                        targetProvided = unparsedTarget.join(".");
                    }

                    const isCacheEnabled = DatabaseManager.isCacheEnabled(options);
                    if (isCacheEnabled && !DatabaseManager.cache) DatabaseManager.enableCache();

                    await this.table
                        .updateOne(
                            { id: key },
                            {
                                $push: {
                                    [targetProvided ? "data." + targetProvided : "data"]: value
                                }
                            },
                            { upsert: true }
                        )
                        .then(async () => {
                            let fetchedData = (await this.table.findOne({ id: key })).data;
                            if (targetProvided) {
                                fetchedData = _.get(fetchedData, targetProvided);

                                if (isCacheEnabled) {
                                    if (!DatabaseManager.redis) {
                                        DatabaseManager.cache.set(this.table.collection.name + "." + key + "." + targetProvided, fetchedData);
                                    } else {
                                        await DatabaseManager.redis.json.set(this.table.collection.name + "." + key + "." + targetProvided, "$", fetchedData);
                                    }
                                }
                            } else {
                                if (isCacheEnabled && tableOptions && tableOptions.cacheLargeData) {
                                    if (!DatabaseManager.redis) {
                                        DatabaseManager.cache.set(this.table.collection.name + "." + key, fetchedData);
                                    } else {
                                        await DatabaseManager.redis.json.set(this.table.collection.name + "." + key, "$", fetchedData);
                                    }
                                }
                            }
                        });

                    if (options && options.returnData) {
                        return await this.get(initialKey, options);
                    } else return true;
                } catch (err) {
                    if (tableOptions && tableOptions.catchErrors) {
                        logger.error("[table.push()]: " + err.message, {
                            label: "Table"
                        });
                    }
                    return null;
                }
            };

            /**
             * @info Remove a value from an array in the table
             * @param {string} key - The key to remove the value from the array
             * @param {string | number | boolean | unknown} value - The value to remove to the key
             * @param {object} options - The options provided. Supports cache: true if the original cache was false and returnData: true if you want the data to be returned
             * @returns {null | boolean | unknown} The result of the operation or the data if returnData is true, null for errors
             * @throws {TypeError} If no key or value was specified
             **/
            this.pull = async function (
                key: string,
                value: string | number | boolean | unknown,
                options?: {
                    cache?: {
                        toggle?: boolean;
                    };
                    returnData?: boolean;
                }
            ): Promise<null | boolean | unknown> {
                try {
                    if (!key) throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                    if (!value && value !== 0) throw new TypeError("No value specified. Need Help ? Visit pogy.xyz/support");

                    const initialKey = key;
                    let targetProvided: string;

                    if (key.includes(".")) {
                        const unparsedTarget = key.split(".");
                        key = unparsedTarget.shift();
                        targetProvided = unparsedTarget.join(".");
                    }

                    const isCacheEnabled = DatabaseManager.isCacheEnabled(options);
                    if (isCacheEnabled && !DatabaseManager.cache) DatabaseManager.enableCache();

                    await this.table
                        .updateOne(
                            { id: key },
                            {
                                $pull: {
                                    [targetProvided ? "data." + targetProvided : "data"]: value
                                }
                            },
                            { upsert: true }
                        )
                        .then(async () => {
                            let fetchedData = (await this.table.findOne({ id: key })).data;
                            if (targetProvided) {
                                fetchedData = _.get(fetchedData, targetProvided);

                                if (options && options.cache && !DatabaseManager.cache) DatabaseManager.enableCache();
                                if (isCacheEnabled) {
                                    if (!DatabaseManager.redis) {
                                        DatabaseManager.cache.set(this.table.collection.name + "." + key + "." + targetProvided, fetchedData);
                                    } else {
                                        await DatabaseManager.redis.json.set(this.table.collection.name + "." + key + "." + targetProvided, "$", fetchedData);
                                    }
                                }
                            } else {
                                if (isCacheEnabled && tableOptions && tableOptions.cacheLargeData) {
                                    if (!DatabaseManager.redis) {
                                        DatabaseManager.cache.set(this.table.collection.name + "." + key, fetchedData);
                                    } else {
                                        await DatabaseManager.redis.json.set(this.table.collection.name + "." + key, "$", fetchedData);
                                    }
                                }
                            }
                        });

                    if (options && options.returnData) {
                        return await this.get(initialKey, options);
                    } else return true;
                } catch (err) {
                    if (tableOptions && tableOptions.catchErrors) {
                        logger.error("[table.pull()]: " + err.message, {
                            label: "Table"
                        });
                    }
                    return null;
                }
            };

            /**
             * @info Shift a value from an array in the table
             * @param {string} key - The key to shift the value from the array
             * @returns {null | boolean | unknown} The result of the operation or the data if returnData is true, null for errors
             **/
            this.shift = async function (
                key: string,
                options?: {
                    cache?: {
                        toggle?: boolean;
                    };
                    returnData?: boolean;
                }
            ): Promise<null | boolean | unknown> {
                try {
                    if (!key) throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");

                    const initialKey = key;
                    let targetProvided: string;

                    if (key.includes(".")) {
                        const unparsedTarget = key.split(".");
                        key = unparsedTarget.shift();
                        targetProvided = unparsedTarget.join(".");
                    }

                    const isCacheEnabled = DatabaseManager.isCacheEnabled(options);
                    if (isCacheEnabled && !DatabaseManager.cache) DatabaseManager.enableCache();

                    await this.table
                        .updateOne(
                            { id: key },
                            {
                                $pop: {
                                    [targetProvided ? "data." + targetProvided : "data"]: -1
                                }
                            },
                            { upsert: true }
                        )
                        .then(async () => {
                            let fetchedData = (await this.table.findOne({ id: key })).data;
                            if (targetProvided) {
                                fetchedData = _.get(fetchedData, targetProvided);

                                if (options && options.cache && !DatabaseManager.cache) DatabaseManager.enableCache();
                                if (isCacheEnabled) {
                                    if (!DatabaseManager.redis) {
                                        DatabaseManager.cache.set(this.table.collection.name + "." + key + "." + targetProvided, fetchedData);
                                    } else {
                                        await DatabaseManager.redis.json.set(this.table.collection.name + "." + key + "." + targetProvided, "$", fetchedData);
                                    }
                                }
                            } else {
                                if (isCacheEnabled && tableOptions && tableOptions.cacheLargeData) {
                                    if (!DatabaseManager.redis) {
                                        DatabaseManager.cache.set(this.table.collection.name + "." + key, fetchedData);
                                    } else {
                                        await DatabaseManager.redis.json.set(this.table.collection.name + "." + key, "$", fetchedData);
                                    }
                                }
                            }
                        });

                    if (options && options.returnData) {
                        return await this.get(initialKey, options);
                    } else return true;
                } catch (err) {
                    if (tableOptions && tableOptions.catchErrors) {
                        logger.error("[table.shift()]: " + err.message, {
                            label: "Table"
                        });
                    }
                    return null;
                }
            };

            /**
             * @info Unshift a value to an array in the table
             * @param {string} key - The key to unshift the value to the array
             * @param {string | number | boolean | unknown} value - The value to unshift to the array
             * @returns {null | boolean | unknown} The result of the operation or the data if returnData is true, null for errors
             **/
            this.unshift = async function (
                key: string,
                value: string | number | boolean | unknown,
                options?: {
                    cache?: {
                        toggle?: boolean;
                    };
                    returnData?: boolean;
                }
            ): Promise<null | boolean | unknown> {
                try {
                    if (!key) throw new TypeError("No key specified. Need Help ? Visit pogy.xyz/support");
                    if (!value && value !== 0) throw new TypeError("No value specified. Need Help ? Visit pogy.xyz/support");

                    const initialKey = key;
                    let targetProvided: string;

                    if (key.includes(".")) {
                        const unparsedTarget = key.split(".");
                        key = unparsedTarget.shift();
                        targetProvided = unparsedTarget.join(".");
                    }

                    const isCacheEnabled = DatabaseManager.isCacheEnabled(options);
                    if (isCacheEnabled && !DatabaseManager.cache) DatabaseManager.enableCache();

                    await this.table
                        .updateOne(
                            { id: key },
                            {
                                $push: {
                                    [targetProvided ? "data." + targetProvided : "data"]: {
                                        $each: [value],
                                        $position: 0
                                    }
                                }
                            },
                            { upsert: true }
                        )
                        .then(async () => {
                            let fetchedData = (await this.table.findOne({ id: key })).data;
                            if (targetProvided) {
                                fetchedData = _.get(fetchedData, targetProvided);

                                if (options && options.cache && !DatabaseManager.cache) DatabaseManager.enableCache();
                                if (isCacheEnabled) {
                                    if (!DatabaseManager.redis) {
                                        DatabaseManager.cache.set(this.table.collection.name + "." + key + "." + targetProvided, fetchedData);
                                    } else {
                                        await DatabaseManager.redis.json.set(this.table.collection.name + "." + key + "." + targetProvided, "$", fetchedData);
                                    }
                                }
                            } else {
                                if (isCacheEnabled && tableOptions && tableOptions.cacheLargeData) {
                                    if (!DatabaseManager.redis) {
                                        DatabaseManager.cache.set(this.table.collection.name + "." + key, fetchedData);
                                    } else {
                                        await DatabaseManager.redis.json.set(this.table.collection.name + "." + key, "$", fetchedData);
                                    }
                                }
                            }
                        });

                    if (options && options.returnData) {
                        return await this.get(initialKey);
                    } else return true;
                } catch (err) {
                    if (tableOptions && tableOptions.catchErrors) {
                        logger.error("[table.unshift()]: " + err.message, {
                            label: "Table"
                        });
                    }
                    return null;
                }
            };

            /**
             * @info Fetch all the schemas from the table
             * @param {TableAllOptions} options - The options to fetch the schemas with
             * @returns {object} The schemas from the table
             * @throws {TypeError} If no key was specified
             **/
            this.all = async function (options?: TableAllOptions): Promise<unknown> {
                try {
                    if (!(options?.cache?.cacheOnly || DatabaseManager?.options?.cache?.cacheOnly)) {
                        const AllStoredData = await (
                            await this.table.collection.find({
                                $where: function () {
                                    const expiredCheck = !(this.expireAt && this.expireAt.getTime() - Date.now() <= 0);
                                    return expiredCheck;
                                }
                            })
                        ).toArray();

                        if (options && options.documentForm) {
                            return AllStoredData;
                        }

                        let filtered = AllStoredData.filter((v) => options?.filter?.({ id: v.id, data: v.data }) ?? true).map((m) => ({
                            id: m.id,
                            data: m.data
                        })) as AllData<unknown>[];

                        if (typeof options?.sort === "string") {
                            if (options.sort.startsWith(".")) options.sort = options.sort.slice(1);
                            const pref = options.sort.split(".");
                            filtered = _.sortBy(filtered, pref).reverse();
                        }

                        return typeof options?.limit === "number" && options.limit > 0 ? filtered.slice(0, options.limit) : filtered;
                    } else {
                        if (DatabaseManager.redis === undefined || DatabaseManager.cache === undefined) return null;

                        if (!DatabaseManager.redis) {
                            const cacheKeys = [...DatabaseManager.cache.keys()];
                            let filtered = cacheKeys.filter((v) => v.startsWith(this.table.collection.name + "."));

                            if (options?.documentForm) {
                                return filtered.map((v) => {
                                    const key = v.split(".").slice(1).join(".");
                                    const value = DatabaseManager.cache.get(v);
                                    return { key, value };
                                });
                            }

                            filtered = filtered.map((v) => {
                                const key = v.split(".").slice(1).join(".");
                                const value = DatabaseManager.cache.get(v);
                                return { key, value };
                            });

                            if (typeof options?.sort === "string") {
                                const key = options.sort;
                                filtered = filtered.filter((v) => v.key.startsWith(key));
                            }

                            return typeof options?.limit === "number" && options.limit > 0 ? filtered.slice(0, options.limit) : filtered;
                        } else {
                            const cacheKeys = await DatabaseManager.redis.keys(this.table.collection.name + ".*");
                            const filtered = cacheKeys.filter((v) => v.startsWith(this.table.collection.name + "."));

                            if (options?.documentForm) {
                                const data = [];
                                for (const key of filtered) {
                                    try {
                                        const value = await DatabaseManager.redis.json.get(key, "$");
                                        data.push({ key, value });
                                    } catch (err) {
                                        const value = await DatabaseManager.redis.get(key);
                                        data.push({ key, value });
                                    }
                                }
                                return data;
                            }

                            const data = [];
                            for (const key of filtered) {
                                try {
                                    const value = await DatabaseManager.redis.json.get(key, "$");
                                    data.push({ key, value });
                                } catch (err) {
                                    const value = await DatabaseManager.redis.get(key);
                                    data.push({ key, value });
                                }
                            }

                            if (typeof options?.sort === "string") {
                                const key = options.sort;
                                data.filter((v) => v.key.startsWith(key));
                            }

                            for (const value of data) {
                                if (typeof value.value === "string") {
                                    value.value = CacheService.parseRedis(value.value);
                                }
                            }

                            return typeof options?.limit === "number" && options.limit > 0 ? data.slice(0, options.limit) : data;
                        }
                    }
                } catch (err) {
                    if (tableOptions && tableOptions.catchErrors) {
                        logger.error("[table.all()]: " + err.message, {
                            label: "Table"
                        });
                    }
                    return {};
                }
            };

            /**
             * @info Delete all the schemas from the table
             * @returns {boolean | null} The result of the operation, null if an error occured
             * @throws {TypeError} If no key was specified
             **/
            this.drop = async function (): Promise<boolean | null> {
                try {
                    if (DatabaseManager.cache) {
                        if (!DatabaseManager.redis) {
                            DatabaseManager.cache.forEach((_, key) => {
                                if (key.startsWith(this.table.collection.name)) {
                                    DatabaseManager.cache.delete(key);
                                }
                            });
                        } else {
                            const keys = await DatabaseManager.redis.keys(this.table.collection.name + "*");
                            for (const key of keys) {
                                await DatabaseManager.redis.del(key);
                            }
                        }
                    }
                    await this.table.collection.drop();
                    return true;
                } catch (err) {
                    if (tableOptions && tableOptions.catchErrors) {
                        logger.error("[table.drop()]: " + err.message, {
                            label: "Table"
                        });
                    }
                    return null;
                }
            };

            /**
             * @info Gets Database statistics
             */
            this.stats = async function () {
                const stats = await this.table.collection.stats();
                return stats;
            };
            return this;
        })();
    } as any as {
        new (
            tableName: string,
            tableOptions?: {
                cacheLargeData?: boolean;
                catchErrors?: boolean;
            }
        ): Promise<CustomizedTable | any>;
    }
};
