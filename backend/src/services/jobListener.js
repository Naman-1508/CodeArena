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

      const passed = !!result.success;
      submission.status = passed ? 'Pass' : 'Fail';
      submission.runtimeMs = result.runtimeMs || 0;
      submission.memoryKb = result.memoryKb || 0;
      submission.output = result.output || '';
      submission.passedCount = result.passed || 0;
      submission.totalCount = result.total || 0;
      submission.testResults = result.testResults || [];
      await submission.save();

      // ── Increment problem acceptance counters ────────────────────────
      // Always count the attempt; only count accepted when passed
      await Problem.findByIdAndUpdate(submission.problemId, {
        $inc: {
          totalAttempts: 1,
          ...(passed ? { totalAccepted: 1 } : {}),
        },
      });

      // Trigger gamification if passed and it's a real Submission (not just a Run)
      if (passed && !submission.isRun) {
        const problem = await Problem.findById(submission.problemId);
        if (problem) {
          // Only award first-solve XP bonus once per problem per user
          const previousPass = await Submission.findOne({
            userId: submission.userId,
            problemId: submission.problemId,
            status: 'Pass',
            _id: { $ne: submission._id }
          });

          await processGamification(
            submission.userId.toString(),
            problem.difficulty,
            !previousPass // isFirstAttempt
          );
        }
      }
    } catch (error) {
      console.error('Error handling completed job:', error);
    }
  });

  queueEvents.on('failed', async ({ jobId, failedReason }) => {
    try {
      const submission = await Submission.findOneAndUpdate(
        { jobId },
        { status: 'Error', output: failedReason || 'Execution failed' },
        { new: true }
      );

      // Still count the attempt even if execution crashed
      if (submission) {
        await Problem.findByIdAndUpdate(submission.problemId, {
          $inc: { totalAttempts: 1 },
        });
      }
    } catch (error) {
      console.error('Error handling failed job:', error);
    }
  });

  console.log('Main Backend listening for execution job results...');
};