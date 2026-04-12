import jwt from 'jsonwebtoken';

/**
 * JWT 认证中间件
 * 从请求头 Authorization: Bearer <token> 中提取并验证 JWT
 * 验证通过后将解码的用户信息挂载到 req.user
 */
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未提供认证 Token', data: null });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token 无效或已过期', data: null });
  }
};

export { protect };
