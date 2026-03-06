import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './config/db.js';
import Problem from './models/Problem.js';

async function seed() {
    await connectDB();

    await Problem.deleteMany({});

    const problems = [
        {
            title: 'Two Sum',
            slug: 'two-sum',
            difficulty: 'Easy',
            description: '<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to <code>target</code>.</p>\n<p>You may assume that each input would have exactly one solution, and you may not use the same element twice.</p>\n<p>You can return the answer in any order.</p>\n<h3 className="text-lg font-semibold mt-6 mb-2">Example 1:</h3>\n<pre className="bg-surface/50 p-4 rounded-lg border border-white/5">\n  <code>Input: nums = [2,7,11,15], target = 9\\nOutput: [0,1]</code>\n</pre>',
            tags: ['Array', 'Hash Table'],
            initialCode: 'function twoSum(nums, target) {\n    // Write your code here\n    \n}',
            solutionTemplate: 'module.exports = twoSum;',
            testCases: [
                { input: [[2, 7, 11, 15], 9], expectedOutput: [0, 1], ignoreOrder: true },
                { input: [[3, 2, 4], 6], expectedOutput: [1, 2], ignoreOrder: true },
                { input: [[3, 3], 6], expectedOutput: [0, 1], ignoreOrder: true },
                { input: [[10, 20, 30, 40], 50], expectedOutput: [1, 2], ignoreOrder: true, isHidden: true }
            ]
        },
        {
            title: 'Valid Parentheses',
            slug: 'valid-parentheses',
            difficulty: 'Easy',
            description: '<p>Given a string <code>s</code> containing just the characters <code>\'(\'</code>, <code>\')\'</code>, <code>\'{\'</code>, <code>\'}\'</code>, <code>\'[\'</code> and <code>\']\'</code>, determine if the input string is valid.</p>\n<p>An input string is valid if:</p>\n<ul>\n<li>Open brackets must be closed by the same type of brackets.</li>\n<li>Open brackets must be closed in the correct order.</li>\n<li>Every close bracket has a corresponding open bracket of the same type.</li>\n</ul>\n<h3 className="text-lg font-semibold mt-6 mb-2">Example 1:</h3>\n<pre className="bg-surface/50 p-4 rounded-lg border border-white/5">\n  <code>Input: s = "()"\\nOutput: true</code>\n</pre>',
            tags: ['String', 'Stack'],
            initialCode: 'function isValid(s) {\n    // Write your code here\n    \n}',
            solutionTemplate: 'module.exports = isValid;',
            testCases: [
                { input: ["()"], expectedOutput: true },
                { input: ["()[]{}"], expectedOutput: true },
                { input: ["(]"], expectedOutput: false },
                { input: ["([)]"], expectedOutput: false, isHidden: true },
                { input: ["{[]}"], expectedOutput: true, isHidden: true }
            ]
        },
        {
            title: 'Maximum Subarray',
            slug: 'maximum-subarray',
            difficulty: 'Medium',
            description: '<p>Given an integer array <code>nums</code>, find the subarray with the largest sum, and return its sum.</p>\n<h3 className="text-lg font-semibold mt-6 mb-2">Example 1:</h3>\n<pre className="bg-surface/50 p-4 rounded-lg border border-white/5">\n  <code>Input: nums = [-2,1,-3,4,-1,2,1,-5,4]\\nOutput: 6\\nExplanation: The subarray [4,-1,2,1] has the largest sum 6.</code>\n</pre>',
            tags: ['Array', 'Divide and Conquer', 'Dynamic Programming'],
            initialCode: 'function maxSubArray(nums) {\n    // Write your code here\n    \n}',
            solutionTemplate: 'module.exports = maxSubArray;',
            testCases: [
                { input: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expectedOutput: 6 },
                { input: [[1]], expectedOutput: 1 },
                { input: [[5, 4, -1, 7, 8]], expectedOutput: 23 },
                { input: [[-1]], expectedOutput: -1, isHidden: true }
            ]
        },
        {
            title: 'Merge Intervals',
            slug: 'merge-intervals',
            difficulty: 'Medium',
            description: '<p>Given an array of <code>intervals</code> where <code>intervals[i] = [starti, endi]</code>, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.</p>\n<h3 className="text-lg font-semibold mt-6 mb-2">Example 1:</h3>\n<pre className="bg-surface/50 p-4 rounded-lg border border-white/5">\n  <code>Input: intervals = [[1,3],[2,6],[8,10],[15,18]]\\nOutput: [[1,6],[8,10],[15,18]]\\nExplanation: Since intervals [1,3] and [2,6] overlap, merge them into [1,6].</code>\n</pre>',
            tags: ['Array', 'Sorting'],
            initialCode: 'function merge(intervals) {\n    // Write your code here\n    \n}',
            solutionTemplate: 'module.exports = merge;',
            testCases: [
                { input: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expectedOutput: [[1, 6], [8, 10], [15, 18]] },
                { input: [[[1, 4], [4, 5]]], expectedOutput: [[1, 5]] },
                { input: [[[1, 4], [0, 4]]], expectedOutput: [[0, 4]], isHidden: true },
                { input: [[[1, 4], [0, 0]]], expectedOutput: [[0, 0], [1, 4]], isHidden: true }
            ]
        },
        {
            title: 'Trapping Rain Water',
            slug: 'trapping-rain-water',
            difficulty: 'Hard',
            description: '<p>Given <code>n</code> non-negative integers representing an elevation map where the width of each bar is <code>1</code>, compute how much water it can trap after raining.</p>\n<h3 className="text-lg font-semibold mt-6 mb-2">Example 1:</h3>\n<pre className="bg-surface/50 p-4 rounded-lg border border-white/5">\n  <code>Input: height = [0,1,0,2,1,0,1,3,2,1,2,1]\\nOutput: 6</code>\n</pre>',
            tags: ['Array', 'Two Pointers', 'Dynamic Programming', 'Stack'],
            initialCode: 'function trap(height) {\n    // Write your code here\n    \n}',
            solutionTemplate: 'module.exports = trap;',
            testCases: [
                { input: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expectedOutput: 6 },
                { input: [[4, 2, 0, 3, 2, 5]], expectedOutput: 9 },
                { input: [[5, 4, 1, 2]], expectedOutput: 1, isHidden: true }
            ]
        },
        // ── NEW PROBLEMS ──────────────────────────────────────────────────────────
        {
            title: 'Contains Duplicate',
            slug: 'contains-duplicate',
            difficulty: 'Easy',
            description: '<p>Given an integer array <code>nums</code>, return <code>true</code> if any value appears <strong>at least twice</strong> in the array, and return <code>false</code> if every element is distinct.</p>\n<h3 className="text-lg font-semibold mt-6 mb-2">Example 1:</h3>\n<pre className="bg-surface/50 p-4 rounded-lg border border-white/5">\n  <code>Input: nums = [1,2,3,1]\\nOutput: true</code>\n</pre>',
            tags: ['Array', 'Hash Table', 'Sorting'],
            initialCode: 'function containsDuplicate(nums) {\n    // Write your code here\n    \n}',
            solutionTemplate: 'module.exports = containsDuplicate;',
            testCases: [
                { input: [[1, 2, 3, 1]], expectedOutput: true },
                { input: [[1, 2, 3, 4]], expectedOutput: false },
                { input: [[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]], expectedOutput: true, isHidden: true }
            ]
        },
        {
            title: 'Best Time to Buy and Sell Stock',
            slug: 'best-time-to-buy-and-sell-stock',
            difficulty: 'Easy',
            description: '<p>You are given an array <code>prices</code> where <code>prices[i]</code> is the price of a given stock on the <code>i<sup>th</sup></code> day.</p>\n<p>You want to maximize your profit by choosing a <strong>single day</strong> to buy one stock and choosing a <strong>different day in the future</strong> to sell that stock.</p>\n<p>Return <em>the maximum profit you can achieve from this transaction</em>. If you cannot achieve any profit, return <code>0</code>.</p>\n<h3 className="text-lg font-semibold mt-6 mb-2">Example 1:</h3>\n<pre className="bg-surface/50 p-4 rounded-lg border border-white/5">\n  <code>Input: prices = [7,1,5,3,6,4]\\nOutput: 5\\nExplanation: Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.</code>\n</pre>',
            tags: ['Array', 'Dynamic Programming'],
            initialCode: 'function maxProfit(prices) {\n    // Write your code here\n    \n}',
            solutionTemplate: 'module.exports = maxProfit;',
            testCases: [
                { input: [[7, 1, 5, 3, 6, 4]], expectedOutput: 5 },
                { input: [[7, 6, 4, 3, 1]], expectedOutput: 0 },
                { input: [[2, 4, 1]], expectedOutput: 2, isHidden: true }
            ]
        },
        {
            title: 'Climbing Stairs',
            slug: 'climbing-stairs',
            difficulty: 'Easy',
            description: '<p>You are climbing a staircase. It takes <code>n</code> steps to reach the top.</p>\n<p>Each time you can either climb <code>1</code> or <code>2</code> steps. In how many distinct ways can you climb to the top?</p>\n<h3 className="text-lg font-semibold mt-6 mb-2">Example 1:</h3>\n<pre className="bg-surface/50 p-4 rounded-lg border border-white/5">\n  <code>Input: n = 2\\nOutput: 2\\nExplanation: There are two ways to climb to the top.\\n1. 1 step + 1 step\\n2. 2 steps</code>\n</pre>',
            tags: ['Math', 'Dynamic Programming', 'Memoization'],
            initialCode: 'function climbStairs(n) {\n    // Write your code here\n    \n}',
            solutionTemplate: 'module.exports = climbStairs;',
            testCases: [
                { input: [2], expectedOutput: 2 },
                { input: [3], expectedOutput: 3 },
                { input: [4], expectedOutput: 5, isHidden: true },
                { input: [10], expectedOutput: 89, isHidden: true }
            ]
        },
        {
            title: 'Product of Array Except Self',
            slug: 'product-except-self',
            difficulty: 'Medium',
            description: '<p>Given an integer array <code>nums</code>, return <em>an array</em> <code>answer</code> <em>such that</em> <code>answer[i]</code> <em>is equal to the product of all the elements of</em> <code>nums</code> <em>except</em> <code>nums[i]</code>.</p>\n<p>The product of any prefix or suffix of <code>nums</code> is <strong>guaranteed</strong> to fit in a <strong>32-bit</strong> integer.</p>\n<p>You must write an algorithm that runs in&nbsp;<code>O(n)</code>&nbsp;time and without using the division operation.</p>\n<h3 className="text-lg font-semibold mt-6 mb-2">Example 1:</h3>\n<pre className="bg-surface/50 p-4 rounded-lg border border-white/5">\n  <code>Input: nums = [1,2,3,4]\\nOutput: [24,12,8,6]</code>\n</pre>',
            tags: ['Array', 'Prefix Sum'],
            initialCode: 'function productExceptSelf(nums) {\n    // Write your code here\n    \n}',
            solutionTemplate: 'module.exports = productExceptSelf;',
            testCases: [
                { input: [[1, 2, 3, 4]], expectedOutput: [24, 12, 8, 6] },
                { input: [[-1, 1, 0, -3, 3]], expectedOutput: [0, 0, 9, 0, 0] },
                { input: [[4, 5, 1, 8, 2]], expectedOutput: [80, 64, 320, 40, 160], isHidden: true }
            ]
        },
        {
            title: 'Top K Frequent Elements',
            slug: 'top-k-frequent-elements',
            difficulty: 'Medium',
            description: '<p>Given an integer array <code>nums</code> and an integer <code>k</code>, return <em>the</em> <code>k</code> <em>most frequent elements</em>. You may return the answer in <strong>any order</strong>.</p>\n<h3 className="text-lg font-semibold mt-6 mb-2">Example 1:</h3>\n<pre className="bg-surface/50 p-4 rounded-lg border border-white/5">\n  <code>Input: nums = [1,1,1,2,2,3], k = 2\\nOutput: [1,2]</code>\n</pre>',
            tags: ['Array', 'Hash Table', 'Divide and Conquer', 'Sorting', 'Heap (Priority Queue)', 'Bucket Sort', 'Counting', 'Quickselect'],
            initialCode: 'function topKFrequent(nums, k) {\n    // Write your code here\n    \n}',
            solutionTemplate: 'module.exports = topKFrequent;',
            testCases: [
                { input: [[1, 1, 1, 2, 2, 3], 2], expectedOutput: [1, 2], ignoreOrder: true },
                { input: [[1], 1], expectedOutput: [1], ignoreOrder: true },
                { input: [[-1, -1], 1], expectedOutput: [-1], ignoreOrder: true, isHidden: true }
            ]
        },
        {
            title: 'Number of Islands',
            slug: 'number-of-islands',
            difficulty: 'Medium',
            description: '<p>Given an <code>m x n</code> 2D binary grid <code>grid</code> which represents a map of <code>\'1\'</code>s (land) and <code>\'0\'</code>s (water), return <em>the number of islands</em>.</p>\n<p>An <strong>island</strong> is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.</p>\n<h3 className="text-lg font-semibold mt-6 mb-2">Example 1:</h3>\n<pre className="bg-surface/50 p-4 rounded-lg border border-white/5">\n  <code>Input: grid = [\n  ["1","1","1","1","0"],\n  ["1","1","0","1","0"],\n  ["1","1","0","0","0"],\n  ["0","0","0","0","0"]\n]\nOutput: 1</code>\n</pre>',
            tags: ['Array', 'Depth-First Search', 'Breadth-First Search', 'Union Find', 'Matrix'],
            initialCode: 'function numIslands(grid) {\n    // Write your code here\n    \n}',
            solutionTemplate: 'module.exports = numIslands;',
            testCases: [
                { input: [[["1", "1", "1", "1", "0"], ["1", "1", "0", "1", "0"], ["1", "1", "0", "0", "0"], ["0", "0", "0", "0", "0"]]], expectedOutput: 1 },
                { input: [[["1", "1", "0", "0", "0"], ["1", "1", "0", "0", "0"], ["0", "0", "1", "0", "0"], ["0", "0", "0", "1", "1"]]], expectedOutput: 3 },
                { input: [[["1", "0", "1", "1", "0"]["0", "0", "0", "0", "0"]]], expectedOutput: 2, isHidden: true }
            ]
        },
        {
            title: 'Median of Two Sorted Arrays',
            slug: 'median-of-two-sorted-arrays',
            difficulty: 'Hard',
            description: '<p>Given two sorted arrays <code>nums1</code> and <code>nums2</code> of size <code>m</code> and <code>n</code> respectively, return <strong>the median</strong> of the two sorted arrays.</p>\n<p>The overall run time complexity should be <code>O(log (m+n))</code>.</p>\n<h3 className="text-lg font-semibold mt-6 mb-2">Example 1:</h3>\n<pre className="bg-surface/50 p-4 rounded-lg border border-white/5">\n  <code>Input: nums1 = [1,3], nums2 = [2]\\nOutput: 2.00000\\nExplanation: merged array = [1,2,3] and median is 2.</code>\n</pre>',
            tags: ['Array', 'Binary Search', 'Divide and Conquer'],
            initialCode: 'function findMedianSortedArrays(nums1, nums2) {\n    // Write your code here\n    \n}',
            solutionTemplate: 'module.exports = findMedianSortedArrays;',
            testCases: [
                { input: [[1, 3], [2]], expectedOutput: 2.0 },
                { input: [[1, 2], [3, 4]], expectedOutput: 2.5 },
                { input: [[0, 0], [0, 0]], expectedOutput: 0.0, isHidden: true },
                { input: [[], [1]], expectedOutput: 1.0, isHidden: true }
            ]
        },
        {
            title: 'Sliding Window Maximum',
            slug: 'sliding-window-maximum',
            difficulty: 'Hard',
            description: '<p>You are given an array of integers&nbsp;<code>nums</code>, there is a sliding window of size <code>k</code> which is moving from the very left of the array to the very right. You can only see the <code>k</code> numbers in the window. Each time the sliding window moves right by one position.</p>\n<p>Return <em>the max sliding window</em>.</p>\n<h3 className="text-lg font-semibold mt-6 mb-2">Example 1:</h3>\n<pre className="bg-surface/50 p-4 rounded-lg border border-white/5">\n  <code>Input: nums = [1,3,-1,-3,5,3,6,7], k = 3\\nOutput: [3,3,5,5,6,7]</code>\n</pre>',
            tags: ['Array', 'Queue', 'Sliding Window', 'Heap (Priority Queue)', 'Monotonic Queue'],
            initialCode: 'function maxSlidingWindow(nums, k) {\n    // Write your code here\n    \n}',
            solutionTemplate: 'module.exports = maxSlidingWindow;',
            testCases: [
                { input: [[1, 3, -1, -3, 5, 3, 6, 7], 3], expectedOutput: [3, 3, 5, 5, 6, 7] },
                { input: [[1], 1], expectedOutput: [1] },
                { input: [[1, -1], 1], expectedOutput: [1, -1], isHidden: true },
                { input: [[9, 11], 2], expectedOutput: [11], isHidden: true }
            ]
        }
    ];

    await Problem.insertMany(problems);
    console.log(`Successfully seeded database with ${problems.length} problems.`);
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
