import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './verifyToken';
export const roleGuard = (allowedRoles: string | string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(403).json({ message: 'Unauthorized access' });
      return;
    }
    const userRole = req.user.role;
    const hasAccess = Array.isArray(userRole)
      ? userRole.some(role => allowedRoles.includes(role))
      : allowedRoles.includes(userRole);

    if (!hasAccess) {
      res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
      return;
    }
    next();
  };
};

module.exports = { roleGuard };
