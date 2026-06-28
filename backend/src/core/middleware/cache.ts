import { Request, Response, NextFunction } from 'express';
import { getCache, setCache } from '../cache/redis';

export const cacheMiddleware = (ttlSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method !== 'GET') {
      return next();
    }

    const businessId = req.user?.businessId;
    if (!businessId) {
      return next();
    }

    const queryStr = Object.keys(req.query).length > 0 ? `:${JSON.stringify(req.query)}` : '';
    const cacheKey = `cache:${businessId}:${req.baseUrl}${req.path}${queryStr}`;

    try {
      const cachedResponse = await getCache(cacheKey);
      if (cachedResponse) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(cachedResponse);
        return;
      }

      res.setHeader('X-Cache', 'MISS');
      const originalJson = res.json.bind(res);

      res.json = (body: any): Response => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          setCache(cacheKey, JSON.stringify(body), ttlSeconds).catch(err =>
            console.error('Error saving cache in middleware:', err)
          );
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error('Redis cache middleware error:', error);
      next();
    }
  };
};
