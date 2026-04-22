import express from 'express';
import {User} from "../models/User.js";

const router = express.Router();

router.get('/', (req, res) => {
  res.send('Backend API is running');
});

/**
 * @route  GET /api/leaderboard
 * @desc   Get global leaderboard
 * @access Public
 * @query  sort (winRate | totalWins, default winRate), page (default 1), limit (default 20)
 * @return { success, message, data: { rankings: [], total, page } }
 */
router.get('/leaderboard', async (req, res, next) => {
  try {
    let {sort = 'winRate', page = '1', limit = '20'} = req.query;

    sort = String(sort).trim().toLowerCase();

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    const matchStage = {
      'stats.totalGames': {$gte: 10},
    };

    const total = await User.countDocuments(matchStage);

    let sortStage;

    if (sort === 'winrate') {
      sortStage = {
        winRate: -1,
        'stats.totalWins': -1,
        'stats.totalGames': -1,
        createdAt: 1,
      };
    } else if (sort === 'totalwins') {
      sortStage = {
        'stats.totalWins': -1,
        winRate: -1,
        'stats.totalGames': -1,
        createdAt: 1,
      };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid sort parameter',
        data: null
      });
    }

    const leaderboard = await User.aggregate([
      {
        $match: matchStage,
      },
      {
        $addFields: {
          winRate: {
            $cond: [
              {$gt: ['$stats.totalGames', 0]},
              {$divide: ['$stats.totalWins', '$stats.totalGames']},
              0,
            ],
          },
        },
      },
      {
        $sort: sortStage,
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          username: 1,
          avatar: {$ifNull: ['$avatar', 'default']},
          winRate: 1,
          totalWins: '$stats.totalWins',
          totalGames: '$stats.totalGames',
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limitNum,
      },
    ]);

    const rankings = leaderboard.map((item, index) => ({
      rank: skip + index + 1,
      ...item,
    }));

    return res.status(200).json({
      success: true,
      message: 'OK',
      data: {
        rankings,
        total,
        page: pageNum,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
