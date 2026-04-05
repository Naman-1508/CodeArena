import Problem from '../models/Problem.js';
import Submission from '../models/Submission.js';
import ProblemProposal from '../models/ProblemProposal.js';
import { addExecutionJob } from '../services/queueService.js';
import axios from 'axios';
import Joi from 'joi';
import { GoogleGenAI } from '@google/genai';

// @route   GET /api/v1/problems
// @desc    Get all problems
export const getProblems = async (req, res) => {
  try {
    // Only select necessary fields for list view
    const problems = await Problem.find().select('title slug difficulty tags').lean();
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

    // Append solutionTemplate (e.g., module.exports wrapper) for Node only
    let executableCode = code;
    if (language === 'node') {
      executableCode = `${code}\n\n${problem.solutionTemplate}`;
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
      problemDescription: problem.description
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

    res.json(submission);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
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
// @desc    Ask AI for a hint on the current problem code
export const askAIHint = async (req, res) => {
  try {
    const aiKey = process.env.GEMINI_API_KEY;
    if (!aiKey) {
      return res.status(500).json({ message: 'Server AI Key is missing.' });
    }

    const problem = await Problem.findOne({ slug: req.params.slug });
    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    const { code, language } = req.body;

    const ai = new GoogleGenAI({ apiKey: aiKey });
    const prompt = `
You are a helpful, encouraging programming tutor. A student is working on the problem: "${problem.title}".
Problem description:
${problem.description}

They are using ${language} and their current code is:
\`\`\`
${code}
\`\`\`

Give them a brief, highly contextual hint about how to proceed or what bug they might have. 
CRITICAL RULE: DO NOT GIVE THEM THE FULL SOLUTION OR EXACT CODE TO COPY AND PASTE. Guide them to the answer pedagogically.
Keep your response under 100 words. Use friendly markdown.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.5 }
    });

    res.json({ hint: response.text.trim() });
  } catch (error) {
    console.error('AI Hint Error:', error);
    res.status(500).json({ message: 'Failed to generate AI hint' });
  }
};