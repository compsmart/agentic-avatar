import jwt from 'jsonwebtoken';

export class AuthMiddleware {
  static generateToken(userId, expiresIn = '1h') {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }
    
    return jwt.sign(
      { 
        userId, 
        timestamp: Date.now(),
        type: 'access'
      },
      process.env.JWT_SECRET,
      { expiresIn }
    );
  }
  
  static verifyToken(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({ 
          error: 'No authorization header provided',
          code: 'NO_AUTH_HEADER'
        });
      }
      
      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ 
          error: 'Invalid authorization format. Expected: Bearer <token>',
          code: 'INVALID_AUTH_FORMAT'
        });
      }
      
      const token = parts[1];
      
      if (!process.env.JWT_SECRET) {
        return res.status(500).json({ 
          error: 'Server configuration error',
          code: 'SERVER_CONFIG_ERROR'
        });
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
      req.tokenTimestamp = decoded.timestamp;
      
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(403).json({ 
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(403).json({ 
          error: 'Token expired',
          code: 'TOKEN_EXPIRED',
          expiredAt: error.expiredAt
        });
      }
      
      return res.status(500).json({ 
        error: 'Token verification failed',
        code: 'VERIFICATION_FAILED'
      });
    }
  }
  
  static optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader) {
        const parts = authHeader.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
          const token = parts[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          req.userId = decoded.userId;
          req.tokenTimestamp = decoded.timestamp;
        }
      }
      
      next();
    } catch (error) {
      // Continue without authentication
      next();
    }
  }
  
  static refreshToken(oldToken) {
    try {
      const decoded = jwt.verify(oldToken, process.env.JWT_SECRET, { ignoreExpiration: true });
      
      // Generate new token with same userId
      return this.generateToken(decoded.userId);
    } catch (error) {
      throw new Error('Invalid token for refresh');
    }
  }
  
  static validateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'API key required',
        code: 'NO_API_KEY'
      });
    }
    
    // In production, validate against database
    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
    
    if (!validApiKeys.includes(apiKey)) {
      return res.status(403).json({ 
        error: 'Invalid API key',
        code: 'INVALID_API_KEY'
      });
    }
    
    next();
  }
}
