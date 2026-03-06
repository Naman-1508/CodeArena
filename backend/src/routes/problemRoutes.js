import express from 'express';
import { getProblems, getProblem, submitProblem, getSubmission, proposeProblem } from '../controllers/problemController.js';
import { protect } from '../middlewares/auth.js';
import Problem from '../models/Problem.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';

const router = express.Router();

router.get('/problems', getProblems);
router.get('/problems/:slug', getProblem);
router.post('/problems/propose', protect, proposeProblem);
router.post('/problems/:id/submit', protect, submitProblem);
router.get('/submissions/:id', protect, getSubmission);

// Daily Challenge - deterministic selection via day-of-year seed
router.get('/daily', async (req, res) => {
    try {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24));

        const total = await Problem.countDocuments();
        if (total === 0) return res.status(404).json({ message: 'No problems available' });

        const index = dayOfYear % total;
        const problem = await Problem.findOne().skip(index).select('title slug difficulty tags').lean();

        res.json({ problem, date: now.toISOString().split('T')[0] });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user's submissions for a specific problem
router.get('/problems/:slug/submissions', protect, async (req, res) => {
    try {
        const problem = await Problem.findOne({ slug: req.params.slug }).select('_id');
        if (!problem) return res.status(404).json({ message: 'Problem not found' });

        const submissions = await Submission.find({
            userId: req.user._id,
            problemId: problem._id
        })
            .sort({ createdAt: -1 })
            .limit(20)
            .select('status language passedCount totalCount runtimeMs createdAt')
            .lean();

        res.json(submissions);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Toggle bookmark on a problem
router.post('/problems/:slug/bookmark', protect, async (req, res) => {
    try {
        const problem = await Problem.findOne({ slug: req.params.slug }).select('_id');
        if (!problem) return res.status(404).json({ message: 'Problem not found' });

        const user = await User.findById(req.user._id);
        const bookmarks = user.bookmarks || [];
        const pidStr = problem._id.toString();

        const isBookmarked = bookmarks.some(b => b.toString() === pidStr);
        if (isBookmarked) {
            user.bookmarks = bookmarks.filter(b => b.toString() !== pidStr);
        } else {
            user.bookmarks = [...bookmarks, problem._id];
        }
        await user.save();

        res.json({ bookmarked: !isBookmarked, count: user.bookmarks.length });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/v1/problems/:slug/hints - returns problem hints (level-gated)
// Returns all hints but masks levels the user hasn't paid for
router.get('/problems/:slug/hints', protect, async (req, res) => {
    try {
        const problem = await Problem.findOne({ slug: req.params.slug }).select('hints').lean();
        if (!problem) return res.status(404).json({ message: 'Problem not found' });

        // Return hints sorted by level - frontend decides which to show/unlock
        const hints = (problem.hints || []).sort((a, b) => a.level - b.level);
        res.json({ hints });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/v1/random - returns a random problem for Mock Interview Mode
// Optional query: ?difficulty=Medium
router.get('/random', async (req, res) => {
    try {
        const { difficulty } = req.query;
        const filter = difficulty && ['Easy', 'Medium', 'Hard'].includes(difficulty)
            ? { difficulty }
            : {};

        const count = await Problem.countDocuments(filter);
        if (count === 0) return res.status(404).json({ message: 'No problems found' });

        const randomIndex = Math.floor(Math.random() * count);
        const problem = await Problem.findOne(filter)
            .skip(randomIndex)
            .select('title slug difficulty tags totalAttempts totalAccepted')
            .lean();

        const acceptanceRate = problem.totalAttempts > 0
            ? Math.round((problem.totalAccepted / problem.totalAttempts) * 100)
            : null;

        res.json({ ...problem, acceptanceRate });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;