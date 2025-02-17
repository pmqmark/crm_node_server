import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
  // Assuming you have a config file
  

// Define interfaces
interface User {
  id: string;
  email: string;
  role: string | string[];
}

interface JWTPayload {
  id: string;
  email: string;
  role: string | string[];
  iat:any;
  exp:any;
}

// Extend Express Request type
export interface AuthRequest extends Request {
  user?: User;
}

// Type guard to check if payload is JWTPayload
function isJWTPayload(payload: any): payload is JWTPayload {
  return (
    typeof payload === 'object' &&
    'id' in payload &&
    'email' in payload &&
    'role' in payload&&
    'iat' in payload&&
    'exp' in payload
  );
}

// Authentication middleware
export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ message: 'No authorization header found' });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }
    

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string);
    
    if (!isJWTPayload(decoded)) {
        
      res.status(401).json({ message: 'Invalid token payload' });
      return;
    }
    

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: 'Invalid or expired token' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

module.exports={authMiddleware}