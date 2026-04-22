import Problem from '../models/Problem.js';
import Submission from '../models/Submission.js';
import ProblemProposal from '../models/ProblemProposal.js';
import User from '../models/User.js';
import { addExecutionJob, executionQueue } from '../services/queueService.js';
import axios from 'axios';
import Joi from 'joi';

// @route   GET /api/v1/problems
// @desc    Get all problems
export const getProblems = async (req, res) => {
  try {
    // Include totalAttempts/totalAccepted so the Problems list can show acceptance rates
    const problems = await Problem.find().select('title slug difficulty tags totalAttempts totalAccepted').lean();
    res.json(problems);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @route   GET /api/v1/problems/:slug
// @desc    Get single problem fully
export const getProblem = async (req, res) => {
  try {
    const slug = req.params.slug;
    let problem = await Problem.findOne({ slug });
    if (!problem) {
      res.status(404).json({ message: 'Problem not found' });
      return;
    }

    // Lazy load real description and starter code from LeetCode if it's a placeholder
    if (problem.description && problem.description.includes('placeholder description')) {
      try {
        const response = await axios.post('https://leetcode.com/graphql', {
          query: `
            query questionData($titleSlug: String!) {
              question(titleSlug: $titleSlug) {
                content
                codeSnippets {
                  langSlug
                  code
                }
              }
            }
          `,
          variables: { titleSlug: slug }
        });

        const qData = response.data?.data?.question;
        if (qData && qData.content) {
          problem.description = qData.content;

          // Try to extract JavaScript starter code
          if (qData.codeSnippets) {
            const jsSnippet = qData.codeSnippets.find(s => s.langSlug === 'javascript');
            if (jsSnippet) {
              problem.initialCode = jsSnippet.code;
            }
          }
          await problem.save();
        }
      } catch (lcError) {
        console.error('Failed to dynamically fetch LeetCode problem data:', lcError.message);
      }
    }

    // Remove hidden test cases before sending to client
    const safeProblem = problem.toObject();
    if (safeProblem.testCases) {
      safeProblem.testCases = safeProblem.testCases.map((tc) => {
        if (tc.isHidden) {
          return { input: [], expectedOutput: null, isHidden: true };
        }
        return tc;
      });
    }
    res.json(safeProblem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const submitSchema = Joi.object({
  code: Joi.string().required(),
  language: Joi.string().valid('node', 'python', 'java', 'cpp').required(),
  type: Joi.string().valid('run', 'submit').optional()
});

// @route   POST /api/v1/problems/:id/submit
// @desc    Submit code for execution
export const submitProblem = async (req, res) => {
  try {
    const { error } = submitSchema.validate(req.body);
    if (error) {
      res.status(400).json({ message: error.details[0].message });
      return;
    }

    const { code, language, type } = req.body;
    const problemId = req.params.id;
    const userId = req.user?.id;
    const isRun = type === 'run';

    const problem = await Problem.findById(problemId);
    if (!problem) {
      res.status(404).json({ message: 'Problem not found' });
      return;
    }

    // 1. Create Pending Submission
    const submission = await Submission.create({
      userId,
      problemId,
      code,
      language,
      isRun,
      status: 'Pending'
    });

    // Append export module logic for node
    let executableCode = code;
    if (language === 'node' && code && problem.metaData && problem.metaData.name) {
      executableCode = `${code}\n\nmodule.exports = ${problem.metaData.name};`;
    }

    // 2. Add job to execution queue queue
    // If it's just a 'run', we only test against non-hidden testcases
    const targetTestCases = isRun ? problem.testCases.filter(tc => !tc.isHidden) : problem.testCases;
    
    const job = await addExecutionJob({
      userId: userId.toString(),
      problemId: problemId.toString(),
      code: executableCode,
      language,
      testCases: targetTestCases,
      problemTitle: problem.title,
      problemDescription: problem.description,
      metaData: problem.metaData
    });

    // 3. Update submission with jobId for polling
    submission.jobId = job.id?.toString();
    await submission.save();

    res.status(202).json({
      message: 'Code submitted for execution',
      submissionId: submission.id,
      jobId: job.id
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @route   GET /api/v1/submissions/:id
// @desc    Check submission status
export const getSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      res.status(404).json({ message: 'Submission not found' });
      return;
    }

    // Ensure auth (only user or admin)
    if (submission.userId.toString() !== req.user?.id && req.user?.role !== 'Admin') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    // If still pending, check queue status and finalize
    if (submission.status === 'Pending' && submission.jobId) {
      const job = await executionQueue.getJob(submission.jobId);
      if (job) {
        const state = await job.getState();
        if (state === 'completed' || state === 'failed') {
          const result = job.returnvalue || {};
          
          if (state === 'failed' || (result.success === false && (!result.testResults || result.testResults.length === 0))) {
            submission.status = 'Error';
            submission.output = result.output || job.failedReason || 'Execution Failed due to internal error';
            submission.runtimeMs = result.runtimeMs || 0;
            submission.memoryKb = result.memoryKb || 0;
          } else {
            // Execution succeeded but check tests
            const passed = result.passed || 0;
            const total = result.total || 0;
            let allPassed = (passed === total && total > 0) || result.success === true;
            
            if (result.testResults && result.testResults.length > 0) {
              allPassed = result.testResults.every(r => r.passed);
            }
            // Some AI evaluations might only give `success: true` and no tests

            submission.status = allPassed ? 'Pass' : 'Fail';
            submission.passedCount = passed;
            submission.totalCount = total;
            submission.output = result.output || 'Execution completed';
            submission.runtimeMs = result.runtimeMs || 0;
            submission.memoryKb = result.memoryKb || 0;
            submission.testResults = result.testResults || [];

            // Calculate Percentiles for "Pass" submissions
            if (submission.status === 'Pass' && !submission.isRun) {
                try {
                    const stats = await Submission.aggregate([
                        { $match: { problemId: submission.problemId, status: 'Pass' } },
                        {
                            $group: {
                                _id: null,
                                totalPasses: { $sum: 1 },
                                fasterCount: { $sum: { $cond: [{ $lt: ["$runtimeMs", submission.runtimeMs] }, 0, 1] } },
                                smallerCount: { $sum: { $cond: [{ $lt: ["$memoryKb", submission.memoryKb] }, 0, 1] } }
                            }
                        }
                    ]);

                    if (stats.length > 0) {
                        const { totalPasses, fasterCount, smallerCount } = stats[0];
                        submission.runtimePercentile = Math.round((fasterCount / totalPasses) * 100);
                        submission.memoryPercentile = Math.round((smallerCount / totalPasses) * 100);
                    } else {
                        submission.runtimePercentile = 100;
                        submission.memoryPercentile = 100;
                    }
                } catch (statError) {
                    console.error('Error calculating submission percentiles:', statError);
                }
            }
          }

          await submission.save();

          // Statistics tracking for actual submits
          if (!submission.isRun) {
            const problem = await Problem.findById(submission.problemId);
            if (problem) {
              problem.totalAttempts = (problem.totalAttempts || 0) + 1;
              if (submission.status === 'Pass') {
                problem.totalAccepted = (problem.totalAccepted || 0) + 1;
              }
              await problem.save();
            }

            if (submission.status === 'Pass') {
               // Prevent infinite XP farming by checking if they already solved this problem
               const priorSolve = await Submission.findOne({ 
                   userId: submission.userId, 
                   problemId: submission.problemId, 
                   status: 'Pass', 
                   _id: { $ne: submission._id } 
               });

               if (!priorSolve) {
                 const user = await User.findById(submission.userId);
                 if (user) {
                    const diff = problem ? problem.difficulty : 'Medium';
                    const xpMap = { Easy: 15, Medium: 25, Hard: 50 };
                    const expEarned = xpMap[diff] || 25;
                    
                    user.xp = (user.xp || 0) + expEarned;
                    user.level = Math.floor(user.xp / 100) + 1;
                    await user.save();
                 }
               }
            }
          }
        }
      }
    }

    res.json(submission);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const proposeSchema = Joi.object({
  title: Joi.string().min(5).max(120).required(),
  difficulty: Joi.string().valid('Easy', 'Medium', 'Hard').required(),
  description: Joi.string().min(20).max(5000).required(),
  tags: Joi.array().items(Joi.string()).optional(),
  exampleInput: Joi.string().allow('').optional(),
  exampleOutput: Joi.string().allow('').optional(),
});

// @route   POST /api/v1/problems/propose
// @desc    Submit a new problem proposal for admin review
export const proposeProblem = async (req, res) => {
  try {
    const { error } = proposeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    const { title, difficulty, description, tags, exampleInput, exampleOutput } = req.body;
    const proposal = await ProblemProposal.create({
      submittedBy: req.user.id,
      title,
      difficulty,
      description,
      tags: tags || [],
      exampleInput,
      exampleOutput,
    });
    res.status(201).json({ message: 'Problem proposal submitted for review!', id: proposal._id });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @route   GET /api/v1/problems/admin/proposals
// @desc    Admin: get all problem proposals
export const getProposals = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const proposals = await ProblemProposal.find().populate('submittedBy', 'username email').sort({ createdAt: -1 });
    res.json(proposals);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @route   POST /api/v1/problems/admin/proposals/:id/approve
// @desc    Admin: approve a problem proposal and insert it
export const approveProposal = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const proposal = await ProblemProposal.findById(req.params.id);
    if (!proposal) return res.status(404).json({ message: 'Proposal not found' });
    
    // Convert proposal to an actual Problem
    const slug = proposal.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const newProblem = await Problem.create({
      title: proposal.title,
      slug,
      difficulty: proposal.difficulty,
      description: proposal.description + (proposal.exampleInput ? `\n\n**Example Input:**\n${proposal.exampleInput}` : ''),
      tags: proposal.tags,
      initialCode: '// Write your code here\n',
      solutionTemplate: 'module.exports = function func() { };',
      testCases: [] // Can be populated later or bypassed via AI code evaluator
    });

    proposal.status = 'Approved';
    await proposal.save();

    res.json({ message: 'Approved successfully', problem: newProblem });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @route   POST /api/v1/problems/:slug/ask-ai
// @desc    Ask AI for a hint / chat message on the current problem code
export const askAIHint = async (req, res) => {
  try {
    const aiKey = process.env.GROQ_API_KEY;
    if (!aiKey) {
      return res.status(500).json({ message: 'Server Groq API Key is missing.' });
    }

    const problem = await Problem.findOne({ slug: req.params.slug });
    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    const { code, language, userMessage, history } = req.body;

    // Build a system context
    const systemContext = `You are an expert, encouraging programming tutor on CodeArena. 
The student is working on: "${problem.title}" (${problem.difficulty}).

Problem description:
${(problem.description || '').replace(/<[^>]*>/g, '').slice(0, 800)}

Student's current ${language} code:
\`\`\`${language}
${code || '// (no code yet)'}
\`\`\`

CRITICAL RULES:
1. NEVER give the full solution or paste-ready code.
2. Guide pedagogically — ask leading questions, point to the right concept.
3. Keep each reply under 150 words.
4. Use friendly markdown with **bold** for key terms.
5. If the student asks something off-topic, gently redirect to the problem.`;

    // Construct the messages array for the chat completion
    const messages = [
      { role: 'system', content: systemContext }
    ];

    const priorHistory = Array.isArray(history) ? history : [];
    priorHistory.forEach(msg => {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    });

    const currentQuestion = userMessage || 'Please review my code and give me a hint on how to proceed.';
    messages.push({ role: 'user', content: currentQuestion });

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.6,
        max_tokens: 400
      },
      {
        headers: {
          'Authorization': `Bearer ${aiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ hint: response.data.choices[0].message.content.trim() });
  } catch (error) {
    console.error('AI Hint Error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to generate AI response' });
  }
};