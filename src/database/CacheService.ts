/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model } from "mongoose";
import { CollectionInterface } from "./collection";
import DatabaseManager from ".";
class CacheService {
    private cache: Map<
        string,
        {
            keys: string[];
        }
    >;

    static cache: Map<
        string,
        {
            keys: string[];
        }
    > = new Map();
    static watchedTables: string[] = [];

    public static setCache(options: { id: string; key: string }) {
        CacheService.cache.set(options.id, {
            keys: [...(CacheService.cache.get(options.id)?.keys || []), options.key]
        });
    }

    public static init(table: Model<CollectionInterface<unknown>>) {
        if (this.watchedTables.includes(table.collection.name)) return;
        this.watchedTables.push(table.collection.name);

        table
            .watch([
                {
                    $match: {
                        operationType: "delete"
                    }
                }
            ])
            .on("change", async (data: any) => {
                const availableCache = CacheService.cache.get(data.documentKey._id.toString());
                if (availableCache && DatabaseManager.cache) {
                    if (!DatabaseManager.redis) {
                        const keys = [...DatabaseManager.cache.keys()].filter((key) => availableCache.keys.includes(key));
                        keys.forEach((key) => DatabaseManager.cache?.delete(key));
                    } else {
                        const keys = availableCache.keys;
                        const redisKeys = await DatabaseManager.redis.keys("*").filter((key) => keys.includes(key));
                        for (let i = 0; i < redisKeys.length; i++) {
                            await DatabaseManager.redis.del(redisKeys[i]);
                        }
                    }
                }
            });
    }

    /**
     * Check if the duration should expire
     * @param {number} duration The duration
     * @returns {boolean}
     */
    public static shouldExpire(duration: number): boolean {
        if (typeof duration !== "number") return false;
        if (duration > Infinity || duration <= 0 || Number.isNaN(duration)) return false;
        return true;
    }

    /**
     * Create a duration
     * @param {number} duration The duration
     * @returns {Date}
     */
    public static createDuration(duration: number): Date {
        if (!this.shouldExpire(duration)) return null;
        const _duration = new Date(Date.now() + duration);
        return _duration;
    }

    /**
     * Format redis
     */
    public static parseRedis = (data: string): unknown => {
        let fetchedData: any = data;
        if (fetchedData.toString().startsWith("boolean:")) {
            fetchedData = fetchedData.replace("boolean:", "");
            if (fetchedData === "true") fetchedData = true;
            else if (fetchedData === "false") fetchedData = false;
        } else if (fetchedData.toString().startsWith("number:")) {
            fetchedData = fetchedData.replace("number:", "");
            fetchedData = Number(fetchedData);
        } else if (fetchedData.toString().startsWith("object:")) {
            const val = fetchedData.replace("object:", "");
            if (val === "null") fetchedData = null;
        } else if (fetchedData.toString().startsWith("string:")) {
            fetchedData = fetchedData.replace("string:", "");
        }

        return fetchedData;
    };
}

export default CacheService;
