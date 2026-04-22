import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const connectionConfig = process.env.REDIS_URL 
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null }) 
  : { host: '127.0.0.1', port: 6379, maxRetriesPerRequest: null };

import { createTempDirectory, writeFilesToTemp, cleanupTempDirectory } from './utils.js';
import { runDockerContainer } from './docker.js';
import fs from 'fs';
import path from 'path';
import { generateJavaDriver } from './runners/javaDriverGenerator.js';
import { generateCppDriver } from './runners/cppDriverGenerator.js';














const worker = new Worker('code-execution', async (job) => {
  console.log(`Processing execution job ${job.id} for user ${job.data.userId}`);

  const { code, language, testCases, problemTitle, problemDescription, metaData } = job.data;

  // If there are absolutely no test cases, we fail early rather than using AI
  if (!testCases || testCases.length === 0) {
    console.log(`[Job ${job.id}] No test cases found! Failing execution.`);
    return {
      success: false,
      output: "No test cases provided for this problem.",
      runtimeMs: 0,
      memoryKb: 0,
      passed: 0,
      total: 0
    };
  }

  // 1. Setup isolated space
  const tempPath = await createTempDirectory('job-');

  try {
    let executableCode = code;
    if (language === 'java' && !executableCode.includes('import java.')) {
      executableCode = `import java.util.*;\nimport java.math.*;\n${executableCode}`;
    }
    if (language === 'cpp' && !executableCode.includes('#include')) {
      executableCode = `#include <bits/stdc++.h>\nusing namespace std;\n${executableCode}`;
    }

    // 2. Prepare files for runner
    await writeFilesToTemp(tempPath, [
      {
        name: language === 'node' ? 'userCode.js' :
          language === 'python' ? 'userCode.py' :
            language === 'java' ? 'Solution.java' : 'solution.cpp', content: executableCode
      },
      { name: 'testCases.json', content: JSON.stringify(testCases) }]
    );

    // Copy runner script 
    const runnerName = language === 'node' ? 'run_tests.js' :
      language === 'python' ? 'run_tests.py' :
        language === 'java' ? 'run_tests.sh' : 'run_tests.sh';
    const runnerSourcePath = path.join(process.cwd(), 'src', 'runners', language, runnerName);

    // For Java and C++, generate dynamic driver code to properly deserialize JSON testcases
    // Guard: if metaData is missing we cannot generate a typed driver — fall back to AI evaluation
    if (language === 'java') {
      if (!metaData || !metaData.params) {
        console.log(`[Job] metaData missing for java — failing execution`);
        await cleanupTempDirectory(tempPath);
        return { success: false, output: "Missing metadata for Java execution", passed: 0, total: 0 };
      }
      const dynamicJavaMain = generateJavaDriver(metaData);
      await fs.promises.writeFile(path.join(tempPath, 'Main.java'), dynamicJavaMain);
      await fs.promises.copyFile(path.join(process.cwd(), 'src', 'runners', 'java', 'gson.jar'), path.join(tempPath, 'gson.jar'));
    }
    if (language === 'cpp') {
      if (!metaData || !metaData.params) {
        console.log(`[Job] metaData missing for cpp — failing execution`);
        await cleanupTempDirectory(tempPath);
        return { success: false, output: "Missing metadata for C++ execution", passed: 0, total: 0 };
      }
      const dynamicCppMain = generateCppDriver(metaData);
      await fs.promises.writeFile(path.join(tempPath, 'main.cpp'), dynamicCppMain);
      await fs.promises.copyFile(path.join(process.cwd(), 'src', 'runners', 'cpp', 'json.hpp'), path.join(tempPath, 'json.hpp'));
    }

    await fs.promises.copyFile(runnerSourcePath, path.join(tempPath, runnerName));

    // 3. Spawns Docker container using the temp path mount
    let executionResult = await runDockerContainer(tempPath, language);

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