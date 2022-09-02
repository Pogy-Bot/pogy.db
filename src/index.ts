import DatabaseManager from "./database";
import _ from "lodash";
import mongoose from "mongoose";
import { logger } from "./logger";
import type {
  Options,
  migrateOptions,
  migrationObject,
  TableAllOptions,
  CustomizedTable,
  PingResult,
} from "./types";

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
   * @param {object} options - The options for the mongo db
   */
  connect: async function (
    url: string,
    options?: Options,
    databaseOptions?: mongoose.ConnectOptions
  ) {
    if (!url) throw new TypeError("A database url was not provided.");

    const connection = await DatabaseManager.initMongo(
      url,
      options,
      databaseOptions
    );

    DatabaseManager.tables = (
      await connection.db.listCollections().toArray()
    ).map((i) => i.name);

    return true;
  },

  /**
   * @info Get the execution time of your queries.
   * @param {object} options - The ping options
   * @returns {PingResult | boolean} - The ping result or false if the data or table is not found
   * @throws {TypeError} - If one of the options are missing
   */
  ping: async function (options: {
    tableName: string;
    dataToGet: string;
  }): Promise<PingResult | boolean> {
    if (!options) throw new TypeError("Ping options were not provided.");
    if (!options.tableName)
      throw new TypeError("A table name was not provided.");
    if (!options.dataToGet)
      throw new TypeError("A data to get was not provided.");
    if (!this.isOnline()) return false;
    if (!DatabaseManager.tables.includes(options.tableName)) return false;

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
      cached: DatabaseManager.cache ? true : false,
      tableName: options.tableName,
      dataToGet: options.dataToGet,
      timeToGetTable: timeToGetTable,
      timeToGetData: timeToGetData,
      totalPing: timeToGetTable + timeToGetData,
    };
  },

  /**
   * @info Copy the database to another connection
   * @param {string} schema - The schema to migrate to.
   * @param {object} newConnection - The new database connection.
   * @returns {migrationObject} - The migrated data.
   */
  migrate: async function (
    schema: string,
    newConnection: string,
    options: migrateOptions
  ): Promise<migrationObject> {
    if (!this.isOnline()) {
      if (!options || !options.hidelogs)
        logger.error(`Unable to migrate since the database was offline`, {
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
        logger.info(`Preparing to migrate schema: "${schema}"`, {
          label: "Migrations",
        });

      const DateNow = Date.now();
      step = 1;
      const data = await (
        await new this.table(schema)
      ).all({
        documentForm: true,
      });
      step = 2;
      if (!options || !options.hidelogs)
        logger.info(`Fetched data in ${Date.now() - DateNow}ms`, {
          label: "Migrations",
        });
      step = 3;
      const newConnectionDatabase = await mongoose.createConnection(
        newConnection
      );
      step = 4;
      try {
        step = 5;
        const newTable = await newConnectionDatabase.createCollection(schema);
        await newTable.insertMany(data);
        step = 7.1;
        if (!options || !options.hidelogs)
          logger.info(`Created migration table`, {
            label: "Migrations",
          });
      } catch (err) {
        step = 6;
        const newTable = await newConnectionDatabase.model(
          schema,
          new mongoose.Schema({
            id: String,
            data: Object,
          })
        );
        await newTable.deleteMany({});
        await newTable.insertMany(data);
        step = 7.2;
        if (!options || !options.hidelogs)
          logger.info(`Updated migration table`, {
            label: "Migrations",
          });
      }

      step = 8;
      newConnectionDatabase.close();

      step = 9;
      if (!options || !options.hidelogs)
        logger.info(`Migration successful`, {
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
    } catch (err) {
      if (!options || !options.hidelogs)
        logger.error(`Migration Error: ${err.message} on step ${step}`, {
          label: "Migrations",
        });
      return {
        table: schema,
        error: err,
      };
    }
  },

  /**
   * Get a table from the database
   * @param {string} table - The name of the table
   * @returns {CustomizedTable | boolean} The table object
   * @throws {TypeError} If the table encounters an error
   */
  table: function (
    tableName: string,
    tableOptions?: {
      cacheLargeData?: boolean;
      catchErrors?: boolean;
    }
  ): Promise<CustomizedTable> {
    return (async () => {
      if (!DatabaseManager.client) return false;
      if (typeof tableName !== "string")
        throw new TypeError(
          "Table name has to be a string. Need Help ? Visit pogy.xyz/support"
        );
      else if (tableName.includes(" "))
        throw new TypeError(
          "Table name cannot include spaces. Need Help ? Visit pogy.xyz/support"
        );

      if (!DatabaseManager.tables.includes(tableName)) {
        await DatabaseManager.client.createCollection(tableName);
        DatabaseManager.tables.push(tableName);
      }
      this.table = DatabaseManager.client.collection(tableName);

      /**
       * @info Get the value of a key from the table
       * @param {string} key - The key to get the value of
       * @param {object} options - The options provided. Supports cache: true if the original cache was false
       * @returns {null | string | object | number} The value of the key
       * @throws {TypeError} If no key was specified
       */
      this.get = async function (
        key: string,
        options?: { cache: boolean }
      ): Promise<null | string | object | number> {
        try {
          if (!key)
            throw new TypeError(
              "No key specified. Need Help ? Visit pogy.xyz/support"
            );

          let fetchedData;
          if (options && options.cache) DatabaseManager.enableCache();
          if (
            DatabaseManager.cache &&
            DatabaseManager.cache.has(this.table.name + "." + key) === true
          ) {
            fetchedData = DatabaseManager.cache.get(
              this.table.name + "." + key
            );
          } else {
            let targetProvided: string;
            if (key.includes(".")) {
              let unparsedTarget = key.split(".");
              key = unparsedTarget.shift();
              targetProvided = unparsedTarget.join(".");
            }
            
            fetchedData = await this.table.findOne({ id: key });
            if (!fetchedData) {
              return null;
            }
            fetchedData = fetchedData.data;
            if (targetProvided) {
              fetchedData = _.get(fetchedData, targetProvided);
              if (DatabaseManager.cache || (options && options.cache))
                DatabaseManager.cache.set(
                  this.table.name + "." + key + "." + targetProvided,
                  fetchedData
                );
            } else {
              if (
                (DatabaseManager.cache &&
                  tableOptions &&
                  tableOptions.cacheLargeData) ||
                (options && options.cache)
              )
                DatabaseManager.cache.set(
                  this.table.name + "." + key,
                  fetchedData
                );
            }
          }
          return fetchedData;
        } catch (err) {
          if (tableOptions && tableOptions.catchErrors) {
            logger.error("[table.get()]: " + err.message, {
              label: "Table",
            });
          }
          return null;
        }
      };

      /**
       * @info Set the value of a key in the table
       * @param {string} key - The key to set the value of
       * @param {string | object | number} value - The value to set the key to
       * @param {object} options - The options provided. Supports cache: true if the original cache was false and returnData: true if you want the data to be returned
       * @returns {null | boolean | any} The result of the operation or the data if returnData is true
       * @throws {TypeError} If no key or value was specified
       **/
      this.set = async function (
        key: string,
        value: string | object | number,
        options?: { cache?: boolean; returnData?: boolean }
      ): Promise<null | boolean> {
        try {
          if (!key)
            throw new TypeError(
              "No key specified. Need Help ? Visit pogy.xyz/support"
            );
          if (!value && value != 0)
            throw new TypeError(
              "No value specified. Need Help ? Visit pogy.xyz/support"
            );

          const initialKey = key;
          let targetProvided: string;
          if (key.includes(".")) {
            let unparsedTarget = key.split(".");
            key = unparsedTarget.shift();
            targetProvided = unparsedTarget.join(".");
          }

          if (options && options.cache) DatabaseManager.enableCache();
          if (targetProvided) {
            if (DatabaseManager.cache || (options && options.cache))
              DatabaseManager.cache.set(
                this.table.name + "." + key + "." + targetProvided,
                value
              );
            await this.table.updateOne(
              { id: key },
              {
                $set: {
                  [targetProvided ? "data." + targetProvided : "data"]: value,
                },
              },
              { upsert: true }
            );
          } else {
            if (
              (DatabaseManager.cache &&
                tableOptions &&
                tableOptions.cacheLargeData) ||
              (options && options.cache)
            )
              DatabaseManager.cache.set(this.table.name + "." + key, value);
            await this.table.updateOne(
              { id: key },
              {
                $set: {
                  [targetProvided ? "data." + targetProvided : "data"]: value,
                },
              },
              { upsert: true }
            );
          }

          if (options && options.returnData) {
            return await this.get(initialKey, options);
          } else return true;
        } catch (err) {
          if (tableOptions && tableOptions.catchErrors) {
            logger.error("[table.set()]: " + err.message, {
              label: "Table",
            });
          }
          return false;
        }
      };

      /**
       * @info Add a value to a key in the table
       * @param {string} key - The key to add the value to
       * @param {number | string | object} value - The value to add to the key
       * @param {object} options - The options provided. Supports cache: true if the original cache was false and returnData: true if you want the data to be returned
       * @returns {null | boolean | any} The result of the operation or the data if returnData is true
       * @throws {TypeError} If no key or value was specified
       **/
      this.add = async function (
        key: string,
        value: number | string | object,
        options?: { cache?: boolean; returnData?: boolean }
      ): Promise<null | boolean> {
        try {
          if (!key)
            throw new TypeError(
              "No key specified. Need Help ? Visit pogy.xyz/support"
            );
          if (isNaN(Number(value)))
            throw new TypeError(
              "Must specify value to add. Need Help ? Visit pogy.xyz/support"
            );

          const initialKey = key;
          let targetProvided: string;

          if (key.includes(".")) {
            let unparsedTarget = key.split(".");
            key = unparsedTarget.shift();
            targetProvided = unparsedTarget.join(".");
          }
          if (isNaN(Number(value))) return true;
          value = parseInt(Number(value).toString());

          if (options && options.cache) DatabaseManager.enableCache();
          if (targetProvided) {
            if (DatabaseManager.cache || (options && options.cache)) {
              if (
                DatabaseManager.cache.get(
                  this.table.name + "." + key + "." + targetProvided
                )
              ) {
                DatabaseManager.cache.set(
                  this.table.name + "." + key + "." + targetProvided,
                  DatabaseManager.cache.get(
                    this.table.name + "." + key + "." + targetProvided
                  ) + value
                );

                await this.table.updateOne(
                  { id: key },
                  {
                    $inc: {
                      [targetProvided ? "data." + targetProvided : "data"]:
                        value,
                    },
                  },
                  { upsert: true }
                );
              } else {
                const dataFetched = await this.table.findOneAndUpdate(
                  { id: key },
                  {
                    $inc: {
                      [targetProvided ? "data." + targetProvided : "data"]:
                        value,
                    },
                  },
                  { upsert: true, new: true }
                );

                if (
                  dataFetched &&
                  dataFetched.value &&
                  dataFetched.value.data
                ) {
                  const incrementedData = _.get(
                    dataFetched.value.data,
                    targetProvided
                  );

                  DatabaseManager.cache.set(
                    this.table.name + "." + key + "." + targetProvided,
                    incrementedData ? incrementedData : value
                  );
                }
              }
            } else {
              await this.table.updateOne(
                { id: key },
                {
                  $inc: {
                    [targetProvided ? "data." + targetProvided : "data"]: value,
                  },
                },
                { upsert: true }
              );
            }
          } else {
            if (
              (DatabaseManager.cache &&
                tableOptions &&
                tableOptions.cacheLargeData) ||
              (options && options.cache)
            )
              DatabaseManager.cache.set(this.table.name + "." + key, value);
            await this.table.updateOne(
              { id: key },
              {
                $inc: {
                  [targetProvided ? "data." + targetProvided : "data"]: value,
                },
              },
              { upsert: true }
            );
          }

          if (options && options.returnData) {
            return await this.get(initialKey, options);
          } else return true;
        } catch (err) {
          if (tableOptions && tableOptions.catchErrors) {
            logger.error("[table.add()]: " + err.message, {
              label: "Table",
            });
          }
          return false;
        }
      };

      /**
       * @info Subtract a value from a key in the table
       * @param {string} key - The key to subtract the value to
       * @param {string | object | number} value - The value to subtract from the key
       * @param {object} options - The options provided. Supports cache: true if the original cache was false and returnData: true if you want the data to be returned
       * @returns {null | boolean | any} The result of the operation or the data if returnData is true
       * @throws {TypeError} If no key or value was specified
       **/
      this.subtract = async function (
        key: string,
        value: string | object | number,
        options?: { cache?: boolean; returnData?: boolean }
      ): Promise<null | boolean> {
        try {
          if (!key)
            throw new TypeError(
              "No key specified. Need Help ? Visit pogy.xyz/support"
            );
          if (isNaN(Number(value)))
            throw new TypeError(
              "Must specify value to subtract. Need Help ? Visit pogy.xyz/support"
            );

          const initialKey = key;
          let targetProvided: string;

          if (key.includes(".")) {
            let unparsedTarget = key.split(".");
            key = unparsedTarget.shift();
            targetProvided = unparsedTarget.join(".");
          }
          if (isNaN(Number(value))) return true;
          value = ~parseInt(Number(value).toString()) + 1;

          if (options && options.cache) DatabaseManager.enableCache();
          if (targetProvided) {
            if (DatabaseManager.cache || (options && options.cache)) {
              if (
                DatabaseManager.cache.get(
                  this.table.name + "." + key + "." + targetProvided
                )
              ) {
                DatabaseManager.cache.set(
                  this.table.name + "." + key + "." + targetProvided,
                  DatabaseManager.cache.get(
                    this.table.name + "." + key + "." + targetProvided
                  ) + value
                );

                await this.table.updateOne(
                  { id: key },
                  {
                    $inc: {
                      [targetProvided ? "data." + targetProvided : "data"]:
                        value,
                    },
                  },
                  { upsert: true }
                );
              } else {
                const dataFetched = await this.table.findOneAndUpdate(
                  { id: key },
                  {
                    $inc: {
                      [targetProvided ? "data." + targetProvided : "data"]:
                        value,
                    },
                  },
                  { upsert: true, new: true }
                );

                if (
                  dataFetched &&
                  dataFetched.value &&
                  dataFetched.value.data
                ) {
                  const decrementedData = _.get(
                    dataFetched.value.data,
                    targetProvided
                  );

                  DatabaseManager.cache.set(
                    this.table.name + "." + key + "." + targetProvided,
                    decrementedData ? decrementedData : value
                  );
                }
              }
            } else {
              await this.table.updateOne(
                { id: key },
                {
                  $inc: {
                    [targetProvided ? "data." + targetProvided : "data"]: value,
                  },
                },
                { upsert: true }
              );
            }
          } else {
            if (
              (DatabaseManager.cache &&
                tableOptions &&
                tableOptions.cacheLargeData) ||
              (options && options.cache)
            )
              DatabaseManager.cache.set(this.table.name + "." + key, value);
            await this.table.updateOne(
              { id: key },
              {
                $inc: {
                  [targetProvided ? "data." + targetProvided : "data"]: value,
                },
              },
              { upsert: true }
            );
          }

          if (options && options.returnData) {
            return await this.get(initialKey, options);
          } else return true;
        } catch (err) {
          if (tableOptions && tableOptions.catchErrors) {
            logger.error("[table.subtract()]: " + err.message, {
              label: "Table",
            });
          }
          return false;
        }
      };

      /**
       * @info Check if a key exists in the table
       * @param {string} key - The key to check if exists
       * @returns {boolean | null} The result of the operation or null if an error occured
       * @throws {TypeError} If no key was specified
       **/
      this.has = async function (key: string): Promise<boolean> {
        try {
          if (!key)
            throw new TypeError(
              "No key specified. Need Help ? Visit pogy.xyz/support"
            );
          let targetProvided: string;
          if (key.includes(".")) {
            let unparsedTarget = key.split(".");
            key = unparsedTarget.shift();
            targetProvided = unparsedTarget.join(".");
          }
          let fetchedData = await this.table.findOne({ id: key });
          if (!fetchedData) {
            return false;
          }
          fetchedData = fetchedData.data;
          if (targetProvided) {
            fetchedData = _.get(fetchedData, targetProvided);
          }
          return typeof fetchedData != "undefined";
        } catch (err) {
          if (tableOptions && tableOptions.catchErrors) {
            logger.error("[table.has()]: " + err.message, {
              label: "Table",
            });
          }
          return null;
        }
      };

      /**
       * @info Delete a key from the table
       * @param {string} key - The key to delete
       * @returns {boolean} The result of the operation
       * @throws {TypeError} If no key was specified or the traget provided is not an object
       **/
      this.delete = async function (key: string): Promise<boolean> {
        try {
          if (!key)
            throw new TypeError(
              "No key specified. Need Help ? Visit pogy.xyz/support"
            );
          let targetProvided: string;
          if (key.includes(".")) {
            let unparsedTarget = key.split(".");
            key = unparsedTarget.shift();
            targetProvided = unparsedTarget.join(".");
          }
          let fetchedData = await this.table.findOne({ id: key });
          if (!fetchedData) {
            return null;
          }
          fetchedData = fetchedData.data;
          if (typeof fetchedData === "object" && targetProvided) {
            if (DatabaseManager.cache) {
              DatabaseManager.cache.forEach((_, key_) => {
                if (
                  key_.startsWith(
                    this.table.name + "." + key + "." + targetProvided
                  )
                ) {
                  DatabaseManager.cache.delete(key_);
                }
              });
            }

            _.unset(fetchedData, targetProvided);
            await this.table.updateOne(
              { id: key },
              { $set: { data: fetchedData } }
            );

            return true;
          } else if (targetProvided)
            throw new TypeError("The target provided is not an object.");
          else {
            if (DatabaseManager.cache) {
              DatabaseManager.cache.forEach((_, key_) => {
                if (key_.startsWith(this.table.name + "." + key)) {
                  DatabaseManager.cache.delete(key_);
                }
              });
            }
            await this.table.deleteOne({ id: key });
          }
          return true;
        } catch (err) {
          if (tableOptions && tableOptions.catchErrors) {
            logger.error("[table.delete()]: " + err.message, {
              label: "Table",
            });
          }
          return false;
        }
      };

      /**
       * @info Push or create a value to an array in the table
       * @param {string} key - The key to push the value to
       * @param {string | object | number} value - The value to push to the key
       * @param {object} options - The options provided. Supports cache: true if the original cache was false and returnData: true if you want the data to be returned
       * @returns {null | boolean | any} The result of the operation or the data if returnData is true
       * @throws {TypeError} If no key or value was specified
       **/
      this.push = async function (
        key: string,
        value: string | object | number,
        options?: { cache?: boolean; returnData?: boolean }
      ): Promise<boolean> {
        try {
          if (!key)
            throw new TypeError(
              "No key specified. Need Help ? Visit pogy.xyz/support"
            );
          if (!value && value != 0)
            throw new TypeError(
              "No value specified. Need Help ? Visit pogy.xyz/support"
            );

          const initialKey = key;

          let targetProvided: string;
          if (key.includes(".")) {
            let unparsedTarget = key.split(".");
            key = unparsedTarget.shift();
            targetProvided = unparsedTarget.join(".");
          }

          await this.table
            .updateOne(
              { id: key },
              {
                $push: {
                  [targetProvided ? "data." + targetProvided : "data"]: value,
                },
              },
              { upsert: true }
            )
            .then(async () => {
              let fetchedData = (await this.table.findOne({ id: key })).data;
              if (targetProvided) {
                fetchedData = _.get(fetchedData, targetProvided);

                if (options && options.cache) DatabaseManager.enableCache();
                if (DatabaseManager.cache || (options && options.cache))
                  DatabaseManager.cache.set(
                    this.table.name + "." + key + "." + targetProvided,
                    fetchedData
                  );
              } else {
                if (
                  (DatabaseManager.cache &&
                    tableOptions &&
                    tableOptions.cacheLargeData) ||
                  (options && options.cache)
                )
                  DatabaseManager.cache.set(
                    this.table.name + "." + key,
                    fetchedData
                  );
              }
            });

          if (options && options.returnData) {
            return await this.get(initialKey, options);
          } else return true;
        } catch (err) {
          if (tableOptions && tableOptions.catchErrors) {
            logger.error("[table.push()]: " + err.message, {
              label: "Table",
            });
          }
          return false;
        }
      };

      /**
       * @info Remove a value from an array in the table
       * @param {string} key - The key to remove the value from the array
       * @param {string | object | number} value - The value to remove to the key
       * @param {object} options - The options provided. Supports cache: true if the original cache was false and returnData: true if you want the data to be returned
       * @returns {null | boolean | any} The result of the operation or the data if returnData is true
       * @throws {TypeError} If no key or value was specified
       **/
      this.pull = async function (
        key: string,
        value: string | object | number,
        options: { cache: boolean; returnData: true }
      ): Promise<boolean> {
        try {
          if (!key)
            throw new TypeError(
              "No key specified. Need Help ? Visit pogy.xyz/support"
            );
          if (!value && value != 0)
            throw new TypeError(
              "No value specified. Need Help ? Visit pogy.xyz/support"
            );

          const initialKey = key;
          let targetProvided: string;

          if (key.includes(".")) {
            let unparsedTarget = key.split(".");
            key = unparsedTarget.shift();
            targetProvided = unparsedTarget.join(".");
          }

          await this.table
            .updateOne(
              { id: key },
              {
                $pull: {
                  [targetProvided ? "data." + targetProvided : "data"]: value,
                },
              },
              { upsert: true }
            )
            .then(async () => {
              let fetchedData = (await this.table.findOne({ id: key })).data;
              if (targetProvided) {
                fetchedData = _.get(fetchedData, targetProvided);

                if (options && options.cache) DatabaseManager.enableCache();
                if (DatabaseManager.cache || (options && options.cache))
                  DatabaseManager.cache.set(
                    this.table.name + "." + key + "." + targetProvided,
                    fetchedData
                  );
              } else {
                if (
                  (DatabaseManager.cache &&
                    tableOptions &&
                    tableOptions.cacheLargeData) ||
                  (options && options.cache)
                )
                  DatabaseManager.cache.set(
                    this.table.name + "." + key,
                    fetchedData
                  );
              }
            });

          if (options && options.returnData) {
            return await this.get(initialKey, options);
          } else return true;
        } catch (err) {
          if (tableOptions && tableOptions.catchErrors) {
            logger.error("[table.pull()]: " + err.message, {
              label: "Table",
            });
          }
          return false;
        }
      };

      /**
       * @info Fetch all the schemas from the table
       * @param {TableAllOptions} options - The options to fetch the schemas with
       * @returns {object} The schemas from the table
       * @throws {TypeError} If no key was specified
       **/
      this.all = async function (options?: TableAllOptions): Promise<object> {
        try {
          let fetchedData = await this.table.find().toArray();
          if (options && options.documentForm) {
            return fetchedData;
          }

          let data = {};
          fetchedData.forEach(async (i) => {
            data[i.id] = i.data;
          });
          return data;
        } catch (err) {
          if (tableOptions && tableOptions.catchErrors) {
            logger.error("[table.all()]: " + err.message, {
              label: "Table",
            });
          }
          return {};
        }
      };

      /**
       * @info Delete all the schemas from the table
       * @returns {boolean} The result of the operation
       * @throws {TypeError} If no key was specified
       **/
      this.drop = async function (): Promise<boolean> {
        try {
          if (DatabaseManager.cache) {
            DatabaseManager.cache.forEach((_, key) => {
              if (key.startsWith(this.table.name)) {
                DatabaseManager.cache.delete(key);
              }
            });
          }
          await this.table.drop();
          return true;
        } catch (err) {
          if (tableOptions && tableOptions.catchErrors) {
            logger.error("[table.drop()]: " + err.message, {
              label: "Table",
            });
          }
          return false;
        }
      };

      return this;
    })();
  } as any as {
    new (
      tableName: string,
      tableOptions: {
        cacheLargeData?: boolean;
        catchErrors?: boolean;
      }
    ): Promise<CustomizedTable>;
  },
};
