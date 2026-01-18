import { Request, Response, NextFunction } from 'express';

/**
 * Authentication Middleware
 * 
 * In a real implementation, this would:
 * 1. Extract JWT token from Authorization header
 * 2. Verify and decode token
 * 3. Attach userId to request object
 * 
 * For MVP, we assume userId is provided via header or will be injected.
 * This is a placeholder that can be replaced with real JWT validation.
 */

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

/**
 * Mock authentication middleware
 * In production, replace with real JWT verification
 */
export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // For MVP: Assume userId comes from header
  // In production: Extract from JWT token
  const userId = req.headers['x-user-id'] as string;
  
  // #region agent log
  console.log('Auth middleware - x-user-id header:', userId, 'all headers:', Object.keys(req.headers).filter(k => k.toLowerCase().includes('user')));
  // #endregion
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: userId required' });
  }

  req.userId = userId;
  next();
};

