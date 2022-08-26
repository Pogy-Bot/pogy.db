import DatabaseManager from "./database";
import mongoose from "mongoose";
import type { Options, migrateOptions, migrationObject } from "./types";
declare const _default: {
    DatabaseManager: typeof DatabaseManager;
    /**
     * Initiate the connection to mongo db
     * @param {string} url - The url of the mongo db
     * @param {object} options - The options for the mongo db
     */
    connect: (url: string, options?: Options, databaseOptions?: mongoose.ConnectOptions) => Promise<boolean>;
    /**
     * @param {string} schema - The schema to migrate to.
     * @param {object} newConnection - The new database connection.
     * @returns {object} - The migrated data.
     */
    migrate: (schema: string, newConnection: string, options: migrateOptions) => Promise<migrationObject>;
    /**
     * Get a table from the database
     * @param {string} table - The name of the table
     * @returns {object} The table object
     * @throws {TypeError} If the table encounters an error
     */
    table: new (tableName: string) => any;
};
export default _default;
