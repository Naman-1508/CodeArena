import { QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import Submission from '../models/Submission.js';
import Problem from '../models/Problem.js';
import { processGamification } from './gamificationService.js';

const connectionConfig = process.env.REDIS_URL 
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null }) 
  : { host: '127.0.0.1', port: 6379, maxRetriesPerRequest: null };
const queueEvents = new QueueEvents('code-execution', { connection: connectionConfig });

export const startJobListener = () => {
  queueEvents.on('completed', async ({ jobId, returnvalue }) => {
    try {
      const result = typeof returnvalue === 'string' ? JSON.parse(returnvalue) : returnvalue;
      const submission = await Submission.findOne({ jobId });

      if (!submission) return;

      submission.status = result.success ? 'Pass' : 'Fail';
      submission.runtimeMs = result.runtimeMs;
      submission.memoryKb = result.memoryKb;
      submission.output = result.output;
      submission.passedCount = result.passed;
      submission.totalCount = result.total;
      submission.testResults = result.testResults || [];
      await submission.save();

      // Trigger gamification if passed and it's a real Submission (not just a Run)
      if (result.success && !submission.isRun) {
        const problem = await Problem.findById(submission.problemId);
        if (problem) {
          // Check if first attempt
          const previousPass = await Submission.findOne({
            userId: submission.userId,
            problemId: submission.problemId,
            status: 'Pass',
            _id: { $ne: submission._id }
          });

          await processGamification(
            submission.userId.toString(),
            problem.difficulty,
            !previousPass
          );
        }
      }
    } catch (error) {
      console.error('Error handling completed job:', error);
    }
  });

  queueEvents.on('failed', async ({ jobId, failedReason }) => {
    try {
      await Submission.findOneAndUpdate(
        { jobId },
        { status: 'Error', output: failedReason }
      );
    } catch (error) {
      console.error('Error handling failed job:', error);
    }
  });

  console.log('Main Backend listening for execution job results...');
};