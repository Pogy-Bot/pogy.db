/// <reference types="node" />
import mongoose from "mongoose";
import { Options } from "../types";
import { EventEmitter } from "events";
declare class DatabaseManager {
    mongoClient: mongoose.Connection | null;
    mongoTables: string[];
    mongoCache: Map<string, any> | null;
    static cache: Map<any, any>;
    static client: mongoose.Connection | null;
    static tables: string[];
    static events: EventEmitter;
    constructor();
    get client(): mongoose.Connection;
    set client(value: mongoose.Connection);
    get tables(): string[];
    set tables(value: string[]);
    get cache(): Map<string, any>;
    set cache(value: Map<string, any>);
    /**
     * It connects to a mongo database and sets up some listeners for the connection.
     * @returns The mongoClient object.
     */
    static initMongo(url: string, options?: Options, databaseOptions?: mongoose.ConnectOptions): Promise<mongoose.Connection>;
    static enableCache(): Promise<boolean>;
}
export default DatabaseManager;
