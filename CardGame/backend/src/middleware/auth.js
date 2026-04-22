import jwt from 'jsonwebtoken';

/**
 * JWT authentication middleware.
 * Extracts and verifies the token from the Authorization: Bearer <token> header.
 * Attaches the decoded user payload to req.user on success.
 */
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication token is required', data: null });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token', data: null });
  }
};

export { protect };
