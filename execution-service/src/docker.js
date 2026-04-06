import { exec } from 'child_process';
import util from 'util';


const execAsync = util.promisify(exec);

export const runDockerContainer = async (
  tempPath,
  language) => {
  // Normalize windows path for docker mount if necessary
  const normalizedPath = tempPath.replace(/\\/g, '/');
  // Mapping language to docker image
  let image = '';
  let command = '';

  if (language === 'node') {
    image = 'node:18-alpine';
    command = 'node run_tests.js';
  } else if (language === 'python') {
    image = 'python:3.10-alpine';
    command = 'python run_tests.py';
  } else if (language === 'java') {
    image = 'eclipse-temurin:17-alpine';
    command = 'sh run_tests.sh';
  } else if (language === 'cpp') {
    image = 'frolvlad/alpine-gxx:latest';
    command = 'sh run_tests.sh';
  }

  const dockerCommand = `docker run --rm --network none --cpus="0.5" --memory="256m" --memory-swap="256m" -v "${normalizedPath}:/app" -w /app ${image} timeout 10s ${command}`;

  const startTime = Date.now();

  try {
    const { stdout, stderr } = await execAsync(dockerCommand);
    const runtimeMs = Date.now() - startTime;

    // Parse the output. We expect the internal runner to print a JSON string at the end.
    try {
      // Find the last line that looks like JSON or parse the entire output if JSON
      const resultObj = JSON.parse(stdout.trim().split('\n').pop() || "{}");

      return {
        success: resultObj.success !== undefined ? resultObj.success : true,
        output: resultObj.output || stdout,
        runtimeMs,
        memoryKb: resultObj.memoryKb || 0, // In a real scenario, could track exact docker memory
        passed: resultObj.passed || 0,
        total: resultObj.total || 0,
        testResults: resultObj.testResults || []
      };
    } catch (parseError) {
      // If runner didn't output JSON, return raw output
      return {
        success: false,
        output: stdout || stderr,
        runtimeMs,
        memoryKb: 0
      };
    }

  } catch (error) {
    const runtimeMs = Date.now() - startTime;

    // Handle timeout or execution errors (e.g. timeout exit code is usually 124 or 143)
    let errorMessage = error.stderr || error.stdout || error.message;
    if (errorMessage.includes('timeout') || error.code === 124 || error.code === 143) {
      errorMessage = 'Execution Timed Out (Exceeded 10 seconds)';
    }

    return {
      success: false,
      output: errorMessage,
      runtimeMs,
      memoryKb: 0
    };
  }
};