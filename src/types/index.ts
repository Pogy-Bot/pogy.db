export type Options = {
  cache?: boolean;
  hidelogs?: boolean;
  logFile?: string;
};

export type migrateOptions = {
  hidelogs?: boolean;
};

export type migrationObject = {
  error: Error | boolean;
  date?: number;
  timeTaken?: number;
  table: string;
  dataCreated?: number;
};

export type TableAllOptions = {
  documentForm?: boolean;
};
