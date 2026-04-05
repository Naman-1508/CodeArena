import express from 'express';
import { protect } from '../middlewares/auth.js';
import User from '../models/User.js';
import Submission from '../models/Submission.js';
import Problem from '../models/Problem.js';

const router = express.Router();

// GET /api/v1/users/me/stats -> Get comprehensive user dashboard stats (heatmap, solvers, etc)
router.get('/me/stats', protect, async (req, res) => {
    try {
        const user = req.user;

        // We need to count unique passed submissions by problem difficulty
        // 1. Get all 'Pass' submissions for the user
        const passedSubmissions = await Submission.find({
            userId: user._id,
            status: 'Pass'
        }).populate('problemId', 'difficulty');

        // Filter down to unique problems solved
        const uniqueSolved = new Map();
        const heatmapData = [];

        passedSubmissions.forEach(sub => {
            // Heatmap Tracking: Increment submission count for the specific day
            const dateString = sub.createdAt.toISOString().split('T')[0];
            const existingDate = heatmapData.find(d => d.date === dateString);
            if (existingDate) {
                existingDate.count += 1;
            } else {
                heatmapData.push({ date: dateString, count: 1 });
            }

            // Track unique problem difficulties
            if (sub.problemId && sub.problemId._id) {
                const pId = sub.problemId._id.toString();
                if (!uniqueSolved.has(pId)) {
                    uniqueSolved.set(pId, sub.problemId.difficulty);
                }
            }
        });

        let easySolved = 0;
        let mediumSolved = 0;
        let hardSolved = 0;
        const tagCounts = {};

        const solvedProblemIds = Array.from(uniqueSolved.keys());
        
        // Fetch the tags for the uniquely solved problems to build a strong/weak topics radar
        const problems = await Problem.find({ _id: { $in: solvedProblemIds } }).select('difficulty tags');
        
        problems.forEach(p => {
            if (p.difficulty === 'Easy') easySolved++;
            if (p.difficulty === 'Medium') mediumSolved++;
            if (p.difficulty === 'Hard') hardSolved++;
            
            p.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        // Convert tags object to array, sorted by count
        const topTags = Object.entries(tagCounts)
            .map(([topic, count]) => ({ topic, count }))
            .sort((a, b) => b.count - a.count);

        // Percentile Calculation
        const totalUsers = await User.countDocuments();
        const usersBelow = await User.countDocuments({ xp: { $lt: user.xp || 0 } });
        const percentile = totalUsers > 1 ? Math.round((usersBelow / totalUsers) * 100) : 100;

        const stats = {
            username: user.username,
            xp: user.xp || 0,
            level: user.level || 1,
            streak: user.currentStreak || 0,
            easySolved,
            mediumSolved,
            hardSolved,
            heatmap: heatmapData,
            solvedIds: solvedProblemIds,
            percentile,
            topTags: topTags.slice(0, 10) // Top 10 concepts mastered
        };

        res.status(200).json(stats);
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ message: 'Server error retrieving stats' });
    }
});

// GET /api/v1/users/me/submissions -> paginated submission history for the current user
router.get('/me/submissions', protect, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const page = parseInt(req.query.page) || 1;

        const submissions = await Submission.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('problemId', 'title slug difficulty')
            .lean();

        const total = await Submission.countDocuments({ userId: req.user._id });

        res.json({ submissions, total, page, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching submissions' });
    }
});

// GET /api/v1/users/leaderboard -> top 50 users by XP
router.get('/leaderboard', async (req, res) => {
    try {
        const users = await User.find()
            .select('username xp level currentStreak')
            .sort({ xp: -1 })
            .limit(50)
            .lean();

        const ranked = users.map((user, index) => ({
            rank: index + 1,
            username: user.username,
            xp: user.xp || 0,
            level: user.level || 1,
            streak: user.currentStreak || 0,
        }));

        res.json(ranked);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching leaderboard' });
    }
});

// GET /api/v1/users/admin/all-users -> Admin route to fetch all users
router.get('/admin/all-users', protect, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Not authorized as admin' });
        }
        const users = await User.find().select('username email role xp level').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching users' });
    }
});

export default router;
