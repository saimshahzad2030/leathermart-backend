import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../config/constants.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  logger.error(`Unhandled Error: ${err.message}`, {
    stack: env.isDev ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    code: err.code,
  });

  // PostgreSQL Unique Key Violation (Code 23505)
  if (err.code === '23505' || err.message?.includes('duplicate key value')) {
    return ApiResponse.error(res, {
      message: 'A record with this unique identifier or slug already exists',
      errorCode: 'ERR_DUPLICATE_RECORD',
      statusCode: HTTP_STATUS.CONFLICT,
    });
  }

  // PostgreSQL Invalid Input Syntax / UUID (Code 22P02 or Prisma P2023)
  if (err.code === '22P02' || err.code === 'P2023' || err.message?.includes('invalid input syntax for type uuid')) {
    return ApiResponse.error(res, {
      message: 'Invalid ID format provided',
      errorCode: 'ERR_INVALID_ID',
      statusCode: HTTP_STATUS.BAD_REQUEST,
    });
  }

  // Prisma Foreign Key Constraint (Code P2003) / PostgreSQL (Code 23503)
  if (err.code === 'P2003' || err.code === '23503') {
    return ApiResponse.error(res, {
      message: err.message?.includes('products_category_slug_fkey')
        ? 'Cannot delete category because it is being used by products.'
        : (err.message || 'Cannot perform operation because this record is referenced by other resources'),
      errorCode: err.errorCode || 'CATEGORY_IN_USE',
      statusCode: HTTP_STATUS.CONFLICT,
      details: err.details || null,
    });
  }

  // Prisma Record Not Found (Code P2025)
  if (err.code === 'P2025') {
    return ApiResponse.error(res, {
      message: err.message || 'Record not found',
      errorCode: err.errorCode || 'CATEGORY_NOT_FOUND',
      statusCode: HTTP_STATUS.NOT_FOUND,
    });
  }

  // Multer Errors (e.g. file size exceeded)
  if (err.name === 'MulterError') {
    let message = 'File upload error';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = `File size exceeds the maximum limit of ${env.MAX_FILE_SIZE_MB}MB`;
    }
    return ApiResponse.error(res, {
      message,
      errorCode: 'ERR_UPLOAD_FAILED',
      statusCode: HTTP_STATUS.BAD_REQUEST,
    });
  }

  // Custom HTTP status code attached to error
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message =
    env.isProd && statusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR
      ? 'An internal server error occurred'
      : err.message || 'Internal Server Error';

  return ApiResponse.error(res, {
    message,
    errorCode: err.errorCode || 'ERR_INTERNAL_SERVER',
    statusCode,
    details: err.details !== undefined ? err.details : null,
  });
}
