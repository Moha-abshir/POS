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

let isConnected = false;
export async function getRedisClient() {
  if (!isConnected) {
    try {
      await redisClient.connect();
      isConnected = true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
    }
  }
  return redisClient;
}

export async function getCache(key: string): Promise<string | null> {
  try {
    const client = await getRedisClient();
    return await client.get(key);
  } catch (error) {
    console.error(`Error getting Redis cache for key ${key}:`, error);
    return null;
  }
}

export async function setCache(key: string, value: string, ttlSeconds?: number): Promise<void> {
  try {
    const client = await getRedisClient();
    if (ttlSeconds) {
      await client.set(key, value, { EX: ttlSeconds });
    } else {
      await client.set(key, value);
    }
  } catch (error) {
    console.error(`Error setting Redis cache for key ${key}:`, error);
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.del(key);
  } catch (error) {
    console.error(`Error deleting Redis cache for key ${key}:`, error);
  }
}

export async function flushPattern(pattern: string): Promise<void> {
  try {
    const client = await getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    console.error(`Error flushing pattern ${pattern} from Redis:`, error);
  }
}
