import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const connectionConfig = { host: '127.0.0.1', port: 6379 };

import { createTempDirectory, writeFilesToTemp, cleanupTempDirectory } from './utils.js';
import { runDockerContainer } from './docker.js';
import { evaluateCodeWithAI } from './aiValidator.js';
import fs from 'fs';
import path from 'path';














const worker = new Worker('code-execution', async (job) => {
  console.log(`Processing execution job ${job.id} for user ${job.data.userId}`);

  const { code, language, testCases, problemTitle, problemDescription } = job.data;

  // AI INTERVENTION: If there are absolutely no test cases (like for bulk seeded problems),
  // we bypass Docker entirely and hit the Gemini AI to evaluate the code's logic.
  if (!testCases || testCases.length === 0) {
    console.log(`[Job ${job.id}] No test cases found! Diverting to AI Code Evaluator...`);
    const aiResult = await evaluateCodeWithAI(language, code, problemTitle || 'Unknown Problem', problemDescription || 'Evaluate general logic and correctness.');
    return aiResult;
  }

  // 1. Setup isolated space
  const tempPath = await createTempDirectory('job-');

  try {
    // 2. Prepare files for runner
    await writeFilesToTemp(tempPath, [
      {
        name: language === 'node' ? 'userCode.js' :
          language === 'python' ? 'userCode.py' :
            language === 'java' ? 'Solution.java' : 'solution.cpp', content: code
      },
      { name: 'testCases.json', content: JSON.stringify(testCases) }]
    );

    // Copy runner script 
    const runnerName = language === 'node' ? 'run_tests.js' :
      language === 'python' ? 'run_tests.py' :
        language === 'java' ? 'run_tests.sh' : 'run_tests.sh';
    const runnerSourcePath = path.join(process.cwd(), 'src', 'runners', language, runnerName);

    // For Java and C++, copy the driver code too
    if (language === 'java') {
      await fs.promises.copyFile(path.join(process.cwd(), 'src', 'runners', 'java', 'Main.java'), path.join(tempPath, 'Main.java'));
    }
    if (language === 'cpp') {
      await fs.promises.copyFile(path.join(process.cwd(), 'src', 'runners', 'cpp', 'main.cpp'), path.join(tempPath, 'main.cpp'));
    }

    await fs.promises.copyFile(runnerSourcePath, path.join(tempPath, runnerName));

    // 3. Spawns Docker container using the temp path mount
    const executionResult = await runDockerContainer(tempPath, language);

    return executionResult;

  } catch (error) {
    console.error('Job Execution Error:', error);
    throw error;
  } finally {
    // 4. Always cleanup
    await cleanupTempDirectory(tempPath);
  }
}, { connection: connectionConfig });

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed! Result:`, job.returnvalue);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error ${err.message}`);
});

console.log('Execution Microservice Worker started and listening for jobs...');