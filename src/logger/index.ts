import { createLogger, format, transports } from "winston";
const { combine, printf } = format;
import chalk from "chalk";

const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${level}] [${chalk.cyan(label)}] ${message}`;
});

const myCustomLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        verbose: 4,
        debug: 5,
        silly: 6
    }
};

const logger = createLogger({
    levels: myCustomLevels.levels,
    format: combine(format.colorize(), format.timestamp({ format: "MM-DD HH:mm:ss" }), myFormat),
    transports: [new transports.Console()]
});

const setLogFile = (file: string) => {
    logger.add(new transports.File({ filename: file }));
};

export { logger, setLogFile };
