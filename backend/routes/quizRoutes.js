import express from 'express';
import { generateQuiz, suggestTopics } from '../quizController.js';

const router = express.Router();

router.post('/generate', generateQuiz);
router.post('/suggest', suggestTopics);

export default router;
