import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../config/constants.js';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      let dataToValidate = req[source];

      // 1. Handle unparsed stringified JSON payload
      if (typeof dataToValidate === 'string') {
        const trimmed = dataToValidate.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          try {
            dataToValidate = JSON.parse(trimmed);
            req[source] = dataToValidate;
          } catch {
            // Keep original string if invalid JSON
          }
        }
      }

      // 2. Handle raw JSON sent under application/x-www-form-urlencoded
      // (e.g., curl -d '{"email":"..."}' without an explicit application/json header)
      if (
        source === 'body' &&
        dataToValidate &&
        typeof dataToValidate === 'object' &&
        !Array.isArray(dataToValidate)
      ) {
        const keys = Object.keys(dataToValidate);
        if (
          keys.length === 1 &&
          typeof keys[0] === 'string' &&
          keys[0].trim().startsWith('{') &&
          keys[0].trim().endsWith('}')
        ) {
          try {
            dataToValidate = JSON.parse(keys[0]);
            req[source] = dataToValidate;
          } catch {
            // Keep original object if not parseable
          }
        } else if (dataToValidate.data && typeof dataToValidate.data === 'object' && !Array.isArray(dataToValidate.data)) {
          // If payload was sent wrapped as { data: { ... } }
          const hasRootFields = Object.keys(dataToValidate).some((k) => k !== 'data');
          if (!hasRootFields) {
            dataToValidate = dataToValidate.data;
            req[source] = dataToValidate;
          }
        }
      }

      const validatedData = schema.parse(dataToValidate || {});
      req[source] = validatedData;
      next();
    } catch (err) {
      if (err.errors) {
        const formattedErrors = {};
        err.errors.forEach((issue) => {
          const path = issue.path.join('.') || 'field';
          if (!formattedErrors[path]) {
            formattedErrors[path] = [];
          }
          formattedErrors[path].push(issue.message);
        });

        return ApiResponse.error(res, {
          message: 'Validation failed on submitted payload',
          errors: formattedErrors,
          errorCode: 'ERR_VALIDATION_FAILED',
          statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        });
      }

      return next(err);
    }
  };
}
