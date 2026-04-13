import express from 'express';
import { getLeaderboard, saveScore } from '../leaderboardController.js';

const router = express.Router();

router.get('/', getLeaderboard);
router.post('/update', saveScore);

export default router;
