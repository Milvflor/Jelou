import jwt from 'jsonwebtoken';

export function verifyJWT(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Validar que el token es para comunicación entre servicios
    if (decoded.type !== 'service') {
      return res.status(403).json({
        message: 'Invalid token type'
      });
    }

    req.jwtPayload = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        message: 'Invalid token signature'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expired'
      });
    }

    console.error('JWT verification error:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
  }
}
