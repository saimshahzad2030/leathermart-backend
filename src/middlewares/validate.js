import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../config/constants.js';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const validatedData = schema.parse(dataToValidate);
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
