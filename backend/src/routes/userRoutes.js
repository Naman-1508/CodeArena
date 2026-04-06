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

        // Also include total submission count (all statuses, not just passed)
        const totalSubmissions = await Submission.countDocuments({ userId: user._id, isRun: false });
        const totalRuns = await Submission.countDocuments({ userId: user._id, isRun: true });

        const stats = {
            username: user.username,
            xp: user.xp || 0,
            level: user.level || 1,
            streak: user.currentStreak || 0,
            easySolved,
            mediumSolved,
            hardSolved,
            totalSolved: easySolved + mediumSolved + hardSolved,
            totalSubmissions,
            totalRuns,
            heatmap: heatmapData,
            solvedIds: solvedProblemIds,
            percentile,
            topTags: topTags.slice(0, 10)
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

// GET /api/v1/users/admin/all-users -> Admin: all users enriched with submission counts
router.get('/admin/all-users', protect, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Not authorized as admin' });
        }
        const users = await User.find()
            .select('username email role xp level currentStreak longestStreak createdAt lastActiveDate')
            .sort({ xp: -1 })
            .lean();

        // Attach per-user submission counts in one aggregation
        const userIds = users.map(u => u._id);
        const subCounts = await Submission.aggregate([
            { $match: { userId: { $in: userIds }, isRun: false } },
            {
                $group: {
                    _id: '$userId',
                    total: { $sum: 1 },
                    passed: { $sum: { $cond: [{ $eq: ['$status', 'Pass'] }, 1, 0] } }
                }
            }
        ]);
        const subMap = {};
        subCounts.forEach(s => { subMap[s._id.toString()] = s; });

        const enriched = users.map((u, idx) => ({
            ...u,
            rank: idx + 1,
            totalSubmissions: subMap[u._id.toString()]?.total || 0,
            passedSubmissions: subMap[u._id.toString()]?.passed || 0,
        }));

        res.json(enriched);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching users' });
    }
});

// GET /api/v1/users/admin/stats -> Admin: full platform analytics
router.get('/admin/stats', protect, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Not authorized as admin' });
        }

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const [
            totalUsers,
            totalSubmissions,
            totalProblems,
            passedSubmissions,
            recentSubmissions,
            difficultyBreakdown,
            topProblems,
            submissionTrend,
            newUsersThisWeek,
        ] = await Promise.all([
            User.countDocuments(),
            Submission.countDocuments({ isRun: false }),
            Problem.countDocuments(),
            Submission.countDocuments({ status: 'Pass', isRun: false }),
            Submission.find({ isRun: false })
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('problemId', 'title difficulty slug')
                .populate('userId', 'username')
                .select('status language createdAt passedCount totalCount runtimeMs userId problemId')
                .lean(),
            Problem.aggregate([
                { $group: { _id: '$difficulty', count: { $sum: 1 }, totalAttempts: { $sum: '$totalAttempts' }, totalAccepted: { $sum: '$totalAccepted' } } }
            ]),
            Problem.find({ totalAttempts: { $gt: 0 } })
                .sort({ totalAttempts: -1 })
                .limit(5)
                .select('title slug difficulty totalAttempts totalAccepted')
                .lean(),
            Submission.aggregate([
                { $match: { isRun: false, createdAt: { $gte: sevenDaysAgo } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: 1 }, passed: { $sum: { $cond: [{ $eq: ['$status', 'Pass'] }, 1, 0] } } } },
                { $sort: { _id: 1 } }
            ]),
            User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
        ]);

        res.json({
            totalUsers,
            totalSubmissions,
            totalProblems,
            passedSubmissions,
            acceptanceRate: totalSubmissions > 0 ? Math.round((passedSubmissions / totalSubmissions) * 100) : 0,
            recentSubmissions,
            difficultyBreakdown,
            topProblems,
            submissionTrend,
            newUsersThisWeek,
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ message: 'Server error fetching admin stats' });
    }
});

export default router;
