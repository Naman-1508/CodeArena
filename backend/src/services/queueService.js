import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const connectionConfig = { host: '127.0.0.1', port: 6379 };

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