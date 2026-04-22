import {pinoHttp} from "pino-http";
import pino from "pino";
import {randomUUID} from 'crypto'

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const logPath = `${dirname(fileURLToPath(import.meta.url))}/logs/.log`;

export const logger = pino({
  redact: {
    paths: [
      "request.headers.authorization",
      "request.headers.cookie",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[Redacted]",
  },
  transport: {
    targets: [
      {
        target: 'pino/file',
        options: {
          destination: logPath,
          mkdir: true,
        },
      },
      {
        target: 'pino-pretty',
        options: {
          translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
          ignore: "pid,hostname",
          messageFormat: '{if msg}{msg}{end}{if request.method} | {request.method} {request.url} -> {response.statusCode} {if timeTaken}{timeTaken}ms{end} req_id={request.id} {if request.remoteAddress}ip={request.remoteAddress}{end}',
          hideObject: true,
        }
      }
    ]
  }
});


export const loggerMiddleWare = pinoHttp({
  logger: logger,

  genReqId(req, res) {
    const existingID = req.id ?? req.headers["x-request-id"]
    if (existingID) return existingID
    const id = randomUUID()
    res.setHeader("X-Request-Id", id);
    return id;
  },

  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },

  wrapSerializers: true,

  customLogLevel(req, res, err) {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    if (res.statusCode >= 300) return "silent";
    return "info";
  },

  customSuccessMessage(req, res) {
    return res.statusCode === 404
        ? "resource not found"
        : `${req.method} completed`;
  },

  customErrorMessage(req, res) {
    return `request errored with status code: ${res.statusCode}`;
  },

  customAttributeKeys: {
    req: "request",
    res: "response",
    err: "error",
    responseTime: "timeTaken",
  },

  customProps(req, res) {
    return {
      customProp: req.customProp,
      customProp2: res.locals?.myCustomData,
    };
  },
});