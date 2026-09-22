import { env } from '$env/dynamic/private';
// We'll install 'ioredis' later
// import { Redis } from 'ioredis';

// const redis = new Redis(env.REDIS_URL || 'redis://localhost:6379');

// export default redis;

// Mock for now until package is installed
export const redis = {
  get: async (key: string) => null,
  set: async (key: string, value: string) => "OK",
  del: async (key: string) => 1
};
