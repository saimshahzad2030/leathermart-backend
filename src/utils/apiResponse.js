import { HTTP_STATUS } from '../config/constants.js';

/**
 * Recursively converts BigInt values to strings for safe JSON serialization.
 * Also preserves Dates, handles custom toJSON implementations (like Prisma.Decimal),
 * and safely processes nested objects and arrays.
 *
 * @param {any} value
 * @param {WeakSet} [seen]
 * @returns {any}
 */
export function serializeBigInt(value, seen = new WeakSet()) {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  // Preserve Date instances as they serialize cleanly via Date.prototype.toJSON
  if (value instanceof Date) {
    return value;
  }

  // If the object implements a custom toJSON method (e.g. Prisma.Decimal), evaluate it
  if (typeof value.toJSON === 'function') {
    return serializeBigInt(value.toJSON(), seen);
  }

  // Guard against circular structures
  if (seen.has(value)) {
    return value;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => serializeBigInt(item, seen));
  }

  const result = {};
  for (const [key, val] of Object.entries(value)) {
    result[key] = serializeBigInt(val, seen);
  }

  return result;
}

// Global safeguard for BigInt serialization across any JSON.stringify invocations
if (typeof BigInt.prototype.toJSON !== 'function') {
  BigInt.prototype.toJSON = function () {
    return this.toString();
  };
}

export class ApiResponse {
  static success(res, {
    data = null,
    message = 'Operation completed successfully',
    statusCode = HTTP_STATUS.OK,
    pagination = null,
  } = {}) {
    const payload = {
      success: true,
      message,
      data,
    };

    if (pagination) {
      payload.pagination = pagination;
    }

    return res.status(statusCode).json(serializeBigInt(payload));
  }

  static created(res, { data, message = 'Resource created successfully' } = {}) {
    return this.success(res, {
      data,
      message,
      statusCode: HTTP_STATUS.CREATED,
    });
  }

  static error(res, {
    message = 'An unexpected error occurred',
    errors = null,
    details = null,
    errorCode = 'ERR_SERVER_ERROR',
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  } = {}) {
    const payload = {
      success: false,
      message,
      errorCode,
      statusCode,
    };

    if (errors !== null) {
      payload.errors = errors;
    }

    if (details !== null) {
      payload.details = details;
    }

    return res.status(statusCode).json(serializeBigInt(payload));
  }
}

