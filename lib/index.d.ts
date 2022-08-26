import DatabaseManager from "./database";
import mongoose from "mongoose";
import type { Options, migrateOptions, migrationObject, CustomizedTable, PingResult } from "./types";
declare const _default: {
    DatabaseManager: typeof DatabaseManager;
    /**
     * @info check if the database is online
     * @returns {boolean} true if the database is online
     */
    isOnline: () => boolean;
    /**
     * @info Initiate the connection to mongo db
     * @param {string} url - The url of the mongo db
     * @param {object} options - The options for the mongo db
     */
    connect: (url: string, options?: Options, databaseOptions?: mongoose.ConnectOptions) => Promise<boolean>;
    /**
     * @info Get the execution time of your queries.
     * @param {object} options - The ping options
     * @returns {PingResult | boolean} - The ping result or false if the data or table is not found
     * @throws {TypeError} - If one of the options are missing
     */
    ping: (options: {
        tableName: string;
        dataToGet: string;
    }) => Promise<PingResult | boolean>;
    /**
     * @info Copy the database to another connection
     * @param {string} schema - The schema to migrate to.
     * @param {object} newConnection - The new database connection.
     * @returns {migrationObject} - The migrated data.
     */
    migrate: (schema: string, newConnection: string, options: migrateOptions) => Promise<migrationObject>;
    /**
     * Get a table from the database
     * @param {string} table - The name of the table
     * @returns {CustomizedTable | boolean} The table object
     * @throws {TypeError} If the table encounters an error
     */
    table: new (tableName: string) => Promise<CustomizedTable>;
};
export = _default;
