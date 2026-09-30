import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { HttpError } from './http-error.js';

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: 'Request validation failed.',
      errors: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });

    return;
  }

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      status: error.status,
      statusCode: error.statusCode,
      message: error.message,
    });

    return;
  }

  if (error instanceof Error) {
    res.status(500).json({
      status: 'error',
      statusCode: 500,
      message: error.message,
    });

    return;
  }

  res.status(500).json({
    status: 'error',
    statusCode: 500,
    message: 'Unexpected server error.',
  });
}
