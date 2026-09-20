import rateLimit from 'express-rate-limit';
import { ApiResponse } from '../utils/apiResponse.js';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(res, {
      message: 'Too many requests from this IP address, please try again later.',
      errorCode: 'ERR_RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    });
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 minutes for auth endpoints
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(res, {
      message: 'Too many login attempts. Please try again after 15 minutes.',
      errorCode: 'ERR_AUTH_RATE_LIMIT',
      statusCode: 429,
    });
  },
});
