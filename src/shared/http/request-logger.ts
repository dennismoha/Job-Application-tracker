import type { NextFunction, Request, Response } from 'express';

import { logger } from '../logging/logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();
  res.on('finish', () => {
    logger.info('http_request', {
      requestId: res.locals.requestId,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });
  next();
}
