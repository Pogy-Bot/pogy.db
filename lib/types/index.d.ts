import { Model } from "mongoose";
import { CollectionInterface } from "../database/collection";
export declare type Options = {
    cache?: {
        toggle?: boolean;
        cacheOnly?: boolean;
    };
    logs?: {
        hidden?: boolean;
        file?: string;
    };
    redis?: {
        url: string;
    };
};
export declare type migrateOptions = {
    logs?: {
        hidden?: boolean;
    };
};
export declare type migrationObject = {
    errors: Array<{
        error: Error | boolean;
        date: number;
        step: number;
    }>;
    date: number;
    timeTaken: number;
    table: string;
    dataCreated: number;
};
export declare type TableAllOptions<T = unknown> = {
    documentForm?: boolean;
    cache?: {
        cacheOnly?: boolean;
    };
    limit?: number;
    sort?: string;
    filter?: (data: AllData<T>) => boolean;
};
export interface AllData<T = unknown> {
    id: string;
    data: T;
}
export declare type CustomizedTable<T = unknown> = {
    table: Model<CollectionInterface<T>>;
    get: (
        key: string,
        options?: {
            cache?: {
                toggle?: boolean;
                cacheOnly?: boolean;
            };
        }
    ) => Promise<null | string | number | T>;
    set: (
        key: string,
        value: string | number | boolean | T,
        options?: {
            cache?: {
                toggle?: boolean;
                cacheOnly?: boolean;
            };
            returnData?: boolean;
            database?: {
                ttl?: number;
            };
            redis?: {
                ttl?: number;
            };
        }
    ) => Promise<null | boolean | T>;
    add: (
        key: string,
        value: number | string,
        options?: {
            cache?: {
                toggle?: boolean;
                cacheOnly?: boolean;
            };
            returnData?: boolean;
        }
    ) => Promise<null | boolean | T>;
    subtract: (
        key: string,
        value: number | string,
        options?: {
            cache?: {
                toggle?: boolean;
                cacheOnly?: boolean;
            };
            returnData?: boolean;
        }
    ) => Promise<null | boolean | T>;
    has: (
        key: string,
        options: {
            cache?: {
                cacheOnly?: boolean;
            };
        }
    ) => Promise<boolean | null>;
    delete: (
        key: string,
        options: {
            cache?: {
                cacheOnly?: boolean;
            };
        }
    ) => Promise<boolean | null>;
    push: (
        key: string,
        value: string | number | boolean | T,
        options?: {
            cache?: {
                toggle?: boolean;
            };
            returnData?: boolean;
        }
    ) => Promise<null | boolean | T>;
    pull: (
        key: string,
        value: string | number | boolean | T,
        options: {
            cache?: {
                toggle?: boolean;
            };
            returnData?: boolean;
        }
    ) => Promise<null | boolean | T>;
    shift: (
        key: string,
        options: {
            cache?: {
                toggle?: boolean;
            };
            returnData?: boolean;
        }
    ) => Promise<null | boolean | unknown>;
    unshift: (
        key: string,
        value: string | number | boolean | unknown,
        options: {
            cache?: {
                toggle?: boolean;
            };
            returnData?: boolean;
        }
    ) => Promise<null | boolean | unknown>;
    all: (options?: TableAllOptions) => Promise<T>;
    drop: () => Promise<boolean | null>;
    stats: () => Promise<unknown>;
};
export declare type pingOptions = {
    tableName: string;
    dataToGet: string;
};
export declare type PingResult = {
    cached: boolean;
    tableName: string;
    dataToGet: string;
    timeToGetTable: number;
    timeToGetData: number;
    totalPing: number;
    redisPing: number | string;
};
