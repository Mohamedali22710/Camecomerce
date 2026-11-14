/** Winston logger writing warnings and security alerts to console and `security.log`. */
import winston from "winston";

const cairoTimeFormat = winston.format((info) => {
  const cairoTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());

  const [month, day, year, hour, minute, second] = cairoTime.split(/[/, :]/);
  info.timestamp = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  return info;
});

const logger = winston.createLogger({
  level: "warn",
  format: winston.format.combine(cairoTimeFormat(), winston.format.json()),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: "security.log",
      level: "warn",
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

export default logger;
