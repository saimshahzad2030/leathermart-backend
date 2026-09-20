import { HTTP_STATUS } from '../config/constants.js';

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

    return res.status(statusCode).json(payload);
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

    return res.status(statusCode).json(payload);
  }
}
