import mongoose from "mongoose";
import { logger, setLogFile } from "../logger";
import { Options } from "../types";

class DatabaseManager {
  public mongoClient: mongoose.Connection | null;
  public mongoTables: string[];
  public mongoCache: Map<string, any> | null;
  static cache: Map<any, any>;
  static client: mongoose.Connection | null;
  static tables: string[];

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
  static async initMongo(
    url: string,
    options?: Options,
    databaseOptions?: mongoose.ConnectOptions
  ) {
    try {
      if (options && options.logFile) setLogFile(options.logFile);
      if (options && options.cache) this.cache = new Map();
      const mongo = mongoose;

      mongo.connection.on("error", (err) => {
        if (err.code === "ECONNREFUSED") {
          this.client = null;
        }
        if (!options || !options.hidelogs)
          logger.error(`Mongoose connection error: ${err.stack}`, {
            label: "Database",
          });
      });

      mongo.connection.on("disconnected", () => {
        this.client = null;
        if (!options || !options.hidelogs)
          logger.error(`Mongoose connection lost`, { label: "Database" });
      });

      mongo.connection.on("connected", () => {
        this.client = mongo.connection;
        if (!options || !options.hidelogs)
          logger.info(`Mongoose connection connected`, { label: "Database" });
      });

      mongo.connection.on("reconnected", () => {
        this.client = mongo.connection;
        if (!options || !options.hidelogs)
          logger.info(`Mongoose connection reconnected`, { label: "Database" });
      });

      mongo.connection.on("reconnectFailed", () => {
        this.client = mongo.connection;
        if (!options || !options.hidelogs)
          logger.info(
            `Mongoose connection failed to connect after the tries.`,
            {
              label: "Database",
            }
          );
      });

      await mongo.connect(
        url,
        databaseOptions || {
          keepAlive: true,
          minPoolSize: 3,
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 10000,
          socketTimeoutMS: 60000,
        }
      );

      return mongo.connection;
    } catch (err) {
      console.log(err);
      logger.error("Error connecting to mongo database: " + err, {
        label: "Database",
      });
      process.exit(1);
    }
  }
}

export default DatabaseManager;
