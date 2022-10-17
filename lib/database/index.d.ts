/// <reference types="node" />
import mongoose from "mongoose";
import { Options } from "../types";
import { EventEmitter } from "events";
import redis, { RedisClientType, RedisFunctions, RedisModules, RedisScripts } from "redis";
declare class DatabaseManager {
    mongoClient: mongoose.Connection | null;
    redisClient: RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null;
    mongoTables: string[];
    mongoCache: Map<string, any> | RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null;
    static cache: Map<string, any> | RedisClientType<RedisModules, RedisFunctions, RedisScripts> | any;
    redisClientURL: string | null;
    static client: mongoose.Connection | null;
    static redis: RedisClientType<RedisModules, RedisFunctions, RedisScripts> | any;
    static tables: string[];
    static events: EventEmitter;
    static redisURL: string;
    constructor();
    get client(): mongoose.Connection;
    set client(value: mongoose.Connection);
    get tables(): string[];
    set tables(value: string[]);
    get cache(): Map<string, any> | redis.RedisClientType<redis.RedisModules, redis.RedisFunctions, redis.RedisScripts>;
    set cache(value: Map<string, any> | redis.RedisClientType<redis.RedisModules, redis.RedisFunctions, redis.RedisScripts>);
    get redis(): redis.RedisClientType<redis.RedisModules, redis.RedisFunctions, redis.RedisScripts>;
    set redis(value: redis.RedisClientType<redis.RedisModules, redis.RedisFunctions, redis.RedisScripts>);
    get redisURL(): string;
    set redisURL(url: string);
    /**
     * It connects to a mongo database and sets up some listeners for the connection.
     * @returns The mongoClient object.
     */
    static initMongo(url: string, options?: Options, databaseOptions?: mongoose.ConnectOptions): Promise<mongoose.Connection>;
    static enableCache(): Promise<boolean>;
}
export default DatabaseManager;
