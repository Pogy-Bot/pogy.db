export declare type Options = {
    cache?: boolean;
    hidelogs?: boolean;
    logFile?: string;
};
export declare type migrateOptions = {
    hidelogs?: boolean;
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
