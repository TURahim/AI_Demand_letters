import compression from 'compression';
import { Request, Response } from 'express';

// Compression middleware with custom filter
export const compressionMiddleware = compression({
  // Only compress responses that are larger than 1kb
  threshold: 1024,
  
  // Compression level (0-9, higher = more compression but slower)
  level: 6,
  
  // Filter function to determine if response should be compressed
  filter: (req: Request, res: Response) => {
    // Don't compress if the client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Fallback to standard compression filter
    return compression.filter(req, res);
  },
});

