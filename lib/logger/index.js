const { createLogger, format, transports } = require("winston"),
  { combine, printf } = format,
  chalk = require("chalk"),
  myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${level}] [${chalk.cyan(label)}] ${message}`;
  }),
  myCustomLevels = {
    levels: {
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      verbose: 4,
      debug: 5,
      silly: 6,
    },
  },
  logger = createLogger({
    levels: myCustomLevels.levels,
    format: combine(
      format.colorize(),
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      myFormat
    ),
    transports: [new transports.Console()],
  });

const setLogFile = (file) => {
  logger.add(new transports.File({ filename: file }));
};

module.exports = { logger, setLogFile };
