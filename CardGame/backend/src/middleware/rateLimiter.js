import rateLimit from 'express-rate-limit';

/**
 * 认证接口限流
 * 默认：每个 IP 15 分钟内最多 10 次请求
 * 可通过环境变量覆盖：
 *   RATE_LIMIT_WINDOW_MS  窗口时长（毫秒）
 *   RATE_LIMIT_MAX        最大请求次数
 */
const authLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试',
    data: null,
  },
});

export { authLimiter };
