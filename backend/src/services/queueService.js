import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const connectionConfig = process.env.REDIS_URL 
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null }) 
  : { host: '127.0.0.1', port: 6379, maxRetriesPerRequest: null };

export const executionQueue = new Queue('code-execution', { connection: connectionConfig });

export const addExecutionJob = async (jobData) => {
  const job = await executionQueue.add('execute-code', jobData, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  });
  return job;
};