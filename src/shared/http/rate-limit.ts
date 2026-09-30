import type { NextFunction, Request, Response } from 'express';

import { env } from '../../config/env.js';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function clientKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function apiRateLimit(req: Request, res: Response, next: NextFunction): void {
  if (req.path.startsWith('/health')) {
    next();
    return;
  }

  const now = Date.now();
  const key = clientKey(req);
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + env.API_RATE_LIMIT_WINDOW_MS }
    : current;

  bucket.count += 1;
  buckets.set(key, bucket);

  res.setHeader('x-rate-limit-limit', String(env.API_RATE_LIMIT_MAX));
  res.setHeader('x-rate-limit-remaining', String(Math.max(0, env.API_RATE_LIMIT_MAX - bucket.count)));
  res.setHeader('x-rate-limit-reset', String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count > env.API_RATE_LIMIT_MAX) {
    res.status(429).json({
      status: 'error',
      statusCode: 429,
      message: 'Too many requests. Try again after the current rate-limit window.',
    });
    return;
  }

  if (buckets.size > 10_000) {
    for (const [bucketKey, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  next();
}
