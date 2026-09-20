import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS, ROLES } from '../config/constants.js';

export async function authenticate(req, res, next) {
  try {
    let token = null;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && (req.cookies.token || req.cookies.accessToken)) {
      token = req.cookies.token || req.cookies.accessToken;
    }

    if (!token) {
      return ApiResponse.error(res, {
        message: 'Authentication token is required to access this resource',
        errorCode: 'ERR_UNAUTHORIZED',
        statusCode: HTTP_STATUS.UNAUTHORIZED,
      });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const admin = await prisma.adminUser.findUnique({
      where: { id: decoded.id },
    });

    if (!admin) {
      return ApiResponse.error(res, {
        message: 'Admin account not found or has been revoked',
        errorCode: 'ERR_UNAUTHORIZED',
        statusCode: HTTP_STATUS.UNAUTHORIZED,
      });
    }

    if (!admin.isActive) {
      return ApiResponse.error(res, {
        message: 'Admin account has been deactivated',
        errorCode: 'ERR_FORBIDDEN',
        statusCode: HTTP_STATUS.FORBIDDEN,
      });
    }

    req.admin = {
      id: admin.id,
      _id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
      permissions: admin.permissions || [],
      isActive: admin.isActive,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return ApiResponse.error(res, {
        message: 'Authentication token has expired. Please log in again.',
        errorCode: 'ERR_TOKEN_EXPIRED',
        statusCode: HTTP_STATUS.UNAUTHORIZED,
      });
    }

    return ApiResponse.error(res, {
      message: 'Invalid authentication token',
      errorCode: 'ERR_INVALID_TOKEN',
      statusCode: HTTP_STATUS.UNAUTHORIZED,
    });
  }
}

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.admin) {
      return ApiResponse.error(res, {
        message: 'Authentication required before authorization check',
        errorCode: 'ERR_UNAUTHORIZED',
        statusCode: HTTP_STATUS.UNAUTHORIZED,
      });
    }

    // Super admin bypasses all role checks
    if (req.admin.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return ApiResponse.error(res, {
        message: 'You do not have the required permissions to perform this operation',
        errorCode: 'ERR_FORBIDDEN',
        statusCode: HTTP_STATUS.FORBIDDEN,
      });
    }

    next();
  };
}
