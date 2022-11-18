import { Model } from "mongoose";
import { CollectionInterface } from "../database/collection";

/* The database options */
export type Options = {
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

/* The migration options */
export type migrateOptions = {
    logs?: {
        hidden?: boolean;
    };
};

/* The migration result */
export type migrationObject = {
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

/* The table 'all' function options */
export type TableAllOptions<T = unknown> = {
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

/* The extended table */
export type CustomizedTable<T = unknown> = {
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
    stats: () => Promise<unknown>
};

/* The ping options */
export type pingOptions = {
    tableName: string;
    dataToGet: string;
};

/* The ping result */
export type PingResult = {
    cached: boolean;
    tableName: string;
    dataToGet: string;
    timeToGetTable: number;
    timeToGetData: number;
    totalPing: number;
    redisPing: number | string;
};
