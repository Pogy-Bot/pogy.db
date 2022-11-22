"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = __importDefault(require("."));
class CacheService {
    static setCache(options) {
        var _a;
        CacheService.cache.set(options.id, {
            keys: [...(((_a = CacheService.cache.get(options.id)) === null || _a === void 0 ? void 0 : _a.keys) || []), options.key]
        });
    }
    static init(table) {
        if (this.watchedTables.includes(table.collection.name))
            return;
        this.watchedTables.push(table.collection.name);
        table
            .watch([
            {
                $match: {
                    operationType: "delete"
                }
            }
        ])
            .on("change", (data) => __awaiter(this, void 0, void 0, function* () {
            const availableCache = CacheService.cache.get(data.documentKey._id.toString());
            if (availableCache && _1.default.cache) {
                if (!_1.default.redis) {
                    const keys = [..._1.default.cache.keys()].filter((key) => availableCache.keys.includes(key));
                    keys.forEach((key) => { var _a; return (_a = _1.default.cache) === null || _a === void 0 ? void 0 : _a.delete(key); });
                }
                else {
                    const keys = availableCache.keys;
                    const redisKeys = yield _1.default.redis.keys("*").filter((key) => keys.includes(key));
                    for (let i = 0; i < redisKeys.length; i++) {
                        yield _1.default.redis.del(redisKeys[i]);
                    }
                }
            }
        }));
    }
    /**
     * Check if the duration should expire
     * @param {number} duration The duration
     * @returns {boolean}
     */
    static shouldExpire(duration) {
        if (typeof duration !== "number")
            return false;
        if (duration > Infinity || duration <= 0 || Number.isNaN(duration))
            return false;
        return true;
    }
    /**
     * Create a duration
     * @param {number} duration The duration
     * @returns {Date}
     */
    static createDuration(duration) {
        if (!this.shouldExpire(duration))
            return null;
        const _duration = new Date(Date.now() + duration);
        return _duration;
    }
}
CacheService.cache = new Map();
CacheService.watchedTables = [];
/**
 * Format redis
 */
CacheService.parseRedis = (data) => {
    let fetchedData = data;
    if (fetchedData.toString().startsWith("boolean:")) {
        fetchedData = fetchedData.replace("boolean:", "");
        if (fetchedData === "true")
            fetchedData = true;
        else if (fetchedData === "false")
            fetchedData = false;
    }
    else if (fetchedData.toString().startsWith("number:")) {
        fetchedData = fetchedData.replace("number:", "");
        fetchedData = Number(fetchedData);
    }
    else if (fetchedData.toString().startsWith("object:")) {
        const val = fetchedData.replace("object:", "");
        if (val === "null")
            fetchedData = null;
    }
    else if (fetchedData.toString().startsWith("string:")) {
        fetchedData = fetchedData.replace("string:", "");
    }
    return fetchedData;
};
exports.default = CacheService;
