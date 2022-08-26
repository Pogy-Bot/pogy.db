import DatabaseManager from "./database";
import _ from "lodash";
import mongoose from "mongoose";
import { logger } from "./logger";
import type {
  Options,
  migrateOptions,
  migrationObject,
  TableAllOptions,
} from "./types";

export = {
  DatabaseManager: DatabaseManager,
  /**
   * Initiate the connection to mongo db
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
   * @param {string} schema - The schema to migrate to.
   * @param {object} newConnection - The new database connection.
   * @returns {object} - The migrated data.
   */
  migrate: async function (
    schema: string,
    newConnection: string,
    options: migrateOptions
  ): Promise<migrationObject> {
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
   * @returns {object} The table object
   * @throws {TypeError} If the table encounters an error
   */
  table: function (tableName: string) {
    return (async () => {
      if (!DatabaseManager.client)
        throw new TypeError(
          "Connect to your database. Need Help ? Visit pogy.xyz/support"
        );
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

      this.get = async function (key: string) {
        if (!key)
          throw new TypeError(
            "No key specified. Need Help ? Visit pogy.xyz/support"
          );

        let fetchedData;
        if (DatabaseManager.cache && DatabaseManager.cache.has(key) === true) {
          fetchedData = DatabaseManager.cache.get(key);
        } else {
          let targetProvided;
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
            if (DatabaseManager.cache)
              DatabaseManager.cache.set(
                key + "." + targetProvided,
                fetchedData
              );
          }
        }
        return fetchedData;
      };

      this.set = async function (key: string, value: any) {
        if (!key)
          throw new TypeError(
            "No key specified. Need Help ? Visit pogy.xyz/support"
          );
        if (!value && value != 0)
          throw new TypeError(
            "No value specified. Need Help ? Visit pogy.xyz/support"
          );
        let targetProvided;
        if (key.includes(".")) {
          let unparsedTarget = key.split(".");
          key = unparsedTarget.shift();
          targetProvided = unparsedTarget.join(".");
        }
        if (DatabaseManager.cache)
          DatabaseManager.cache.set(key + "." + targetProvided, value);
        await this.table.updateOne(
          { id: key },
          {
            $set: {
              [targetProvided ? "data." + targetProvided : "data"]: value,
            },
          },
          { upsert: true }
        );
        return true;
      };

      this.add = async function (key: string, value: any) {
        if (!key)
          throw new TypeError(
            "No key specified. Need Help ? Visit pogy.xyz/support"
          );
        if (isNaN(value))
          throw new TypeError(
            "Must specify value to add. Need Help ? Visit pogy.xyz/support"
          );
        let targetProvided;
        if (key.includes(".")) {
          let unparsedTarget = key.split(".");
          key = unparsedTarget.shift();
          targetProvided = unparsedTarget.join(".");
        }
        if (isNaN(value)) return true;
        value = parseInt(value);
        if (DatabaseManager.cache)
          DatabaseManager.cache.set(key + "." + targetProvided, value);
        await this.table.updateOne(
          { id: key },
          {
            $inc: {
              [targetProvided ? "data." + targetProvided : "data"]: value,
            },
          },
          { upsert: true }
        );
        return true;
      };

      this.subtract = async function (key: string, value: any) {
        if (!key)
          throw new TypeError(
            "No key specified. Need Help ? Visit pogy.xyz/support"
          );
        if (isNaN(value))
          throw new TypeError(
            "Must specify value to subtract. Need Help ? Visit pogy.xyz/support"
          );
        let targetProvided;
        if (key.includes(".")) {
          let unparsedTarget = key.split(".");
          key = unparsedTarget.shift();
          targetProvided = unparsedTarget.join(".");
        }
        if (isNaN(value)) return true;
        value = ~parseInt(value) + 1;
        if (DatabaseManager.cache)
          DatabaseManager.cache.set(key + "." + targetProvided, value);
        await this.table.updateOne(
          { id: key },
          {
            $inc: {
              [targetProvided ? "data." + targetProvided : "data"]: value,
            },
          },
          { upsert: true }
        );
        return true;
      };

      this.has = async function (key: string) {
        if (!key)
          throw new TypeError(
            "No key specified. Need Help ? Visit pogy.xyz/support"
          );
        let targetProvided;
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
      };

      this.delete = async function (key: string) {
        if (!key)
          throw new TypeError(
            "No key specified. Need Help ? Visit pogy.xyz/support"
          );
        let targetProvided;
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
          _.unset(fetchedData, targetProvided);
          await this.table.updateOne(
            { id: key },
            { $set: { data: fetchedData } }
          );
          return true;
        } else if (targetProvided)
          throw new TypeError("targetProvided is not an object.");
        else await this.table.deleteOne({ id: key });
        return true;
      };

      this.push = async function (key: string, value: any) {
        if (!key)
          throw new TypeError(
            "No key specified. Need Help ? Visit pogy.xyz/support"
          );
        if (!value && value != 0)
          throw new TypeError(
            "No value specified. Need Help ? Visit pogy.xyz/support"
          );
        let targetProvided;
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

              if (DatabaseManager.cache)
                DatabaseManager.cache.set(
                  key + "." + targetProvided,
                  fetchedData
                );
            }
          });
        return true;
      };

      this.all = async function (options: TableAllOptions) {
        let fetchedData = await this.table.find().toArray();
        if (options && options.documentForm) {
          return fetchedData;
        }

        let data = {};
        fetchedData.forEach(async (i) => {
          data[i.id] = i.data;
        });
        return data;
      };

      this.drop = async function () {
        await this.table.drop();
        return true;
      };

      return this;
    })()
  } as any as { new (tableName: string): any },
};
