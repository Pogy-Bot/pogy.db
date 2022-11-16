import { Collection } from "mongoose";
export declare type Options = {
    cache?: boolean;
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
    error: Error | boolean;
    date?: number;
    timeTaken?: number;
    table: string;
    dataCreated?: number;
};
export declare type TableAllOptions = {
    documentForm?: boolean;
};
export declare type CustomizedTable = {
    table: Collection;
    get: (key: string, options?: {
        cache: boolean;
    }) => Promise<null | string | object | number | any>;
    set: (key: string, value: string | object | number, options?: {
        cache?: boolean;
        returnData?: boolean;
    }) => Promise<null | boolean | any>;
    add: (key: string, value: string | object | number, options?: {
        cache?: boolean;
        returnData?: boolean;
    }) => Promise<null | boolean | any>;
    subtract: (key: string, value: string | object | number, options?: {
        cache?: boolean;
        returnData?: boolean;
    }) => Promise<null | boolean | any>;
    has: (key: string) => Promise<boolean | null>;
    delete: (key: string) => Promise<boolean | null>;
    push: (key: string, value: string | object | number, options?: {
        cache?: boolean;
        returnData?: boolean;
    }) => Promise<null | boolean | any>;
    pull: (key: string, value: string | object | number, options?: {
        cache?: boolean;
        returnData?: boolean;
    }) => Promise<null | boolean | any>;
    all: (options?: TableAllOptions) => Promise<object | any>;
    drop: () => Promise<boolean>;
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
