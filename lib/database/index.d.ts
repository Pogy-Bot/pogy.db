/// <reference types="node" />
import mongoose from "mongoose";
import { Options } from "../types";
import { EventEmitter } from "events";
import { RedisClientType, RedisFunctions, RedisModules, RedisScripts } from "redis";
declare class DatabaseManager {
    mongoClient: mongoose.Connection | null;
    redisClient: RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null;
    mongoTables: string[];
    mongoCache: Map<string, any> | RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null;
    static cache: Map<string, any> | RedisClientType<RedisModules, RedisFunctions, RedisScripts> | any;
    redisClientURL: string | null;
    options: Options | null;
    static client: mongoose.Connection | null;
    static redis: RedisClientType<RedisModules, RedisFunctions, RedisScripts> | any;
    static tables: string[];
    static events: EventEmitter;
    static redisURL: string;
    static options: Options;
    constructor();
    get client(): mongoose.Connection;
    set client(value: mongoose.Connection);
    get tables(): string[];
    set tables(value: string[]);
    get cache(): RedisClientType<RedisModules, RedisFunctions, RedisScripts> | Map<string, any>;
    set cache(value: RedisClientType<RedisModules, RedisFunctions, RedisScripts> | Map<string, any>);
    get redis(): RedisClientType<RedisModules, RedisFunctions, RedisScripts>;
    set redis(value: RedisClientType<RedisModules, RedisFunctions, RedisScripts>);
    get redisURL(): string;
    set redisURL(url: string);
    /**
     * It connects to a mongo database and sets up some listeners for the connection.
     * @returns The mongoClient object.
     */
    static initMongo(url: string, options?: Options, databaseOptions?: mongoose.ConnectOptions): Promise<mongoose.Connection>;
    static enableCache(): Promise<boolean>;
    static isCacheEnabled(options: any): boolean;
}
export default DatabaseManager;
