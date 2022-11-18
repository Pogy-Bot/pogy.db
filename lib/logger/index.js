"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.setLogFile = exports.logger = void 0;
const winston_1 = require("winston");
const { combine, printf } = winston_1.format;
const chalk_1 = __importDefault(require("chalk"));
const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${level}] [${chalk_1.default.cyan(label)}] ${message}`;
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
const logger = (0, winston_1.createLogger)({
    levels: myCustomLevels.levels,
    format: combine(winston_1.format.colorize(), winston_1.format.timestamp({ format: "MM-DD HH:mm:ss" }), myFormat),
    transports: [new winston_1.transports.Console()]
});
exports.logger = logger;
const setLogFile = (file) => {
    logger.add(new winston_1.transports.File({ filename: file }));
};
exports.setLogFile = setLogFile;
