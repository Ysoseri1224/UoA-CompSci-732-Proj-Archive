import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication endpoints.
 * Defaults: max 10 requests per IP per 15 minutes.
 * Override via environment variables:
 *   RATE_LIMIT_WINDOW_MS  Window duration in milliseconds
 *   RATE_LIMIT_MAX        Maximum number of requests per window
 */
const authLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    data: null,
  },
});

export { authLimiter };
