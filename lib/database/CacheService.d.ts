import { Model } from "mongoose";
import { CollectionInterface } from "./collection";
declare class CacheService {
    private cache;
    static cache: Map<
        string,
        {
            keys: string[];
        }
    >;
    static setCache(options: { id: string; key: string }): void;
    static init(table: Model<CollectionInterface<unknown>>): void;
    /**
     * Check if the duration should expire
     * @param {number} duration The duration
     * @returns {boolean}
     */
    static shouldExpire(duration: number): boolean;
    /**
     * Create a duration
     * @param {number} duration The duration
     * @returns {Date}
     */
    static createDuration(duration: number): Date;
    /**
     * Format redis
     */
    static parseRedis: (data: string) => unknown;
}
export default CacheService;
