import { createClient } from 'redis';

let redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Proactively sanitize if the terminal CLI connection command was accidentally pasted
if (redisUrl.startsWith('redis-cli -u ')) {
  redisUrl = redisUrl.replace('redis-cli -u ', '').trim();
} else if (redisUrl.includes('redis-cli')) {
  // Catch any quotes or slightly different formats
  const match = redisUrl.match(/redis(?:s)?:\/\/.*$/);
  if (match) {
    redisUrl = match[0].trim();
  }
}

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

let connectionPromise: Promise<any> | null = null;

export async function getRedisClient() {
  if (redisClient.isOpen) {
    return redisClient;
  }

  if (!connectionPromise) {
    connectionPromise = (async () => {
      try {
        await redisClient.connect();
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        connectionPromise = null; // Reset on failure to allow retry
        throw error;
      }
    })();
  }

  await connectionPromise;
  return redisClient;
}

interface CacheEntry {
  value: string;
  expiresAt: number | null;
}

const memoryCache = new Map<string, CacheEntry>();

export async function getCache(key: string): Promise<string | null> {
  try {
    const client = await getRedisClient();
    const val = await client.get(key);
    if (val !== null) return val;
  } catch (error) {
    // Redis unavailable - fall back to memory cache
  }

  const entry = memoryCache.get(key);
  if (entry) {
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      memoryCache.delete(key);
      return null;
    }
    return entry.value;
  }
  return null;
}

export async function setCache(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
  memoryCache.set(key, { value, expiresAt });

  try {
    const client = await getRedisClient();
    if (ttlSeconds) {
      await client.set(key, value, { EX: ttlSeconds });
    } else {
      await client.set(key, value);
    }
  } catch (error) {
    console.warn(`[Cache] Redis set error for key ${key} (memory fallback used):`, error);
  }
}

export async function deleteCache(key: string): Promise<void> {
  memoryCache.delete(key);
  try {
    const client = await getRedisClient();
    await client.del(key);
  } catch (error) {
    console.warn(`[Cache] Redis del error for key ${key}:`, error);
  }
}

export async function flushPattern(pattern: string): Promise<void> {
  // Convert glob pattern (e.g. cache:123:*notifications*) to regex
  const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  for (const k of memoryCache.keys()) {
    if (regexPattern.test(k)) {
      memoryCache.delete(k);
    }
  }

  try {
    const client = await getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    console.warn(`[Cache] Redis flushPattern error for ${pattern}:`, error);
  }
}
