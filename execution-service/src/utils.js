import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const createTempDirectory = async (prefix = 'job-') => {
  const dirName = `${prefix}${uuidv4()}`;
  const tempPath = path.join(process.cwd(), 'tmp', dirName);
  await fs.mkdir(tempPath, { recursive: true });
  return tempPath;
};

export const writeFilesToTemp = async (
tempPath,
files) =>
{
  for (const file of files) {
    const filePath = path.join(tempPath, file.name);
    await fs.writeFile(filePath, file.content, 'utf-8');
  }
};

export const copyRunnerFile = async (
runnerType,
tempPath) =>
{
  const sourcePath = path.join(process.cwd(), 'src', 'runners', runnerType, 'run_tests.js'); // Assuming node runner logic
  const destPath = path.join(tempPath, 'run_tests.js');
  await fs.copyFile(sourcePath, destPath);
};

export const cleanupTempDirectory = async (tempPath) => {
  try {
    await fs.rm(tempPath, { recursive: true, force: true });
  } catch (err) {
    console.error(`Failed to cleanup temp directory ${tempPath}:`, err);
  }
};