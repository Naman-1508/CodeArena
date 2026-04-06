import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({ host: '127.0.0.1', port: 6379, maxRetriesPerRequest: null });
const executionQueue = new Queue('code-execution', { connection });
const queueEvents = new QueueEvents('code-execution', { connection });

async function run() {
    console.log("Adding Java test job");
    const javaCode = `
import java.util.*;
class Solution {
    public int[] twoSum(int[] nums, int target) {
        HashMap<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[] {};
    }
}`;

    const job2 = await executionQueue.add('execute-java', {
        userId: "dummy",
        problemId: "dummy",
        code: javaCode,
        language: "java",
        testCases: [
            { input: [[2, 7, 11, 15], 9], expectedOutput: [0, 1], isHidden: false },
            { input: [[3, 2, 4], 6], expectedOutput: [1, 2], isHidden: false },
            { input: [[3, 3], 6], expectedOutput: [0, 1], isHidden: false }
        ],
        problemTitle: "Two Sum",
        problemDescription: "test",
        metaData: {
            "name": "twoSum",
            "params": [
                { "name": "nums", "type": "integer[]" },
                { "name": "target", "type": "integer" }
            ],
            "return": { "type": "integer[]" }
        }
    });

    console.log("Added job2:", job2.id);
    const result2 = await job2.waitUntilFinished(queueEvents);
    console.log("Java Result:");
    console.log(JSON.stringify(result2, null, 2));

    process.exit(0);
}

run().catch(console.error);
