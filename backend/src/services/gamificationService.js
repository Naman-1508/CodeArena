import User from '../models/User.js';
import redisClient from '../config/redis.js';

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000];

export const calculateXP = (difficulty, isFirstAttempt) => {
  const BASE = { Easy: 10, Medium: 25, Hard: 50 };
  const base = BASE[difficulty] || 10;
  return isFirstAttempt ? Math.floor(base * 1.5) : base;
};

export const getLevelFromXP = (xp) => {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return Math.min(level, LEVEL_THRESHOLDS.length); // Cap at max level
};

export const processGamification = async (userId, problemDifficulty, isFirstAttempt) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    // 1. XP & Level
    const earnedXp = calculateXP(problemDifficulty, isFirstAttempt);
    user.xp = (user.xp || 0) + earnedXp;
    user.level = getLevelFromXP(user.xp);

    // 2. Streaks - defensive: handle null/undefined lastActiveDate
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!user.lastActiveDate) {
      // First time solving - start streak
      user.currentStreak = 1;
      user.longestStreak = 1;
    } else {
      const lastActive = new Date(user.lastActiveDate);
      lastActive.setHours(0, 0, 0, 0);

      const diffMs = today.getTime() - lastActive.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Same day - no change to streak
      } else if (diffDays === 1) {
        // Consecutive day - increment
        user.currentStreak = (user.currentStreak || 0) + 1;
        if (user.currentStreak > (user.longestStreak || 0)) {
          user.longestStreak = user.currentStreak;
        }
      } else {
        // Streak broken - reset to 1
        user.currentStreak = 1;
      }
    }

    user.lastActiveDate = new Date();
    await user.save();

    // 3. Update Redis Leaderboard (Sorted sets)
    try {
      await redisClient.zAdd('leaderboard:global', { score: user.xp, value: user._id.toString() });
    } catch (redisErr) {
      // Non-fatal: Redis leaderboard update failed, but XP is already saved to DB
      console.warn('Redis leaderboard update failed (non-fatal):', redisErr.message);
    }

    return { earnedXp, newStreak: user.currentStreak, newLevel: user.level };
  } catch (error) {
    console.error('Gamification Processing Error:', error);
  }
};