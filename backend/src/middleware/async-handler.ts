import { Request, Response, NextFunction } from 'express';

/**
 * Async handler wrapper for Express async routes
 * Catches async errors and passes them to error handler middleware
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

