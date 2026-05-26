import { Request, Response, NextFunction } from 'express';

export const roleGuard = (requiredRole: 'SUPERVISOR') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.role !== requiredRole) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
};
