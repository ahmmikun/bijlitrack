import jwt from 'jsonwebtoken';

/**
 * Middleware to protect routes and verify JWT
 */
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    console.warn(`[Auth] Rejected - no token: ${req.method} ${req.originalUrl} (IP: ${req.ip})`);
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    console.warn(`[Auth] Rejected - invalid token: ${req.method} ${req.originalUrl} (IP: ${req.ip}) - ${error.message}`);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};
