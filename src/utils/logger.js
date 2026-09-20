import { env } from '../config/env.js';

const sanitize = (val) => {
  if (typeof val === 'string') {
    return val.replace(/(password|token|secret)=([^&]+)/gi, '$1=[REDACTED]');
  }
  return val;
};

export const logger = {
  info: (msg, ...args) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${sanitize(msg)}`, ...args.map(sanitize));
  },
  warn: (msg, ...args) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${sanitize(msg)}`, ...args.map(sanitize));
  },
  error: (msg, ...args) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${sanitize(msg)}`, ...args.map(sanitize));
  },
  debug: (msg, ...args) => {
    if (env.isDev) {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${sanitize(msg)}`, ...args.map(sanitize));
    }
  },
};
