import Problem from '../models/Problem.js';
import Submission from '../models/Submission.js';
import ProblemProposal from '../models/ProblemProposal.js';
import { addExecutionJob } from '../services/queueService.js';
import axios from 'axios';
import Joi from 'joi';

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
  language: Joi.string().valid('node', 'python', 'java', 'cpp').required()
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

    const { code, language } = req.body;
    const problemId = req.params.id;
    const userId = req.user?.id;

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
      status: 'Pending'
    });

    // Append solutionTemplate (e.g., module.exports wrapper) for Node only
    let executableCode = code;
    if (language === 'node') {
      executableCode = `${code}\n\n${problem.solutionTemplate}`;
    }

    // 2. Add job to execution queue queue
    const job = await addExecutionJob({
      userId: userId.toString(),
      problemId: problemId.toString(),
      code: executableCode,
      language,
      testCases: problem.testCases // The worker gets all (including hidden) test cases
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